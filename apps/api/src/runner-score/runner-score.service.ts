import {
   BadRequestException,
   HttpException,
   HttpStatus,
   Inject,
   Injectable,
   Logger,
   NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import IORedis from 'ioredis';

import { CacheService } from '@/cache/cache.service';
import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { buildOrderBy, buildPaginationArgs, buildSearchWhere } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { type RateLimitResult, RateLimitService } from '@/rate-limit/rate-limit.service';
import { REDIS_CLIENT } from '@/redis/redis.module';

import type { CreateRunnerScoreDto } from './dto/create-runner-score.dto';
import type { RunnerRankQueryDto } from './dto/runner-rank-query.dto';
import type { UpdateRunnerScoreVisibilityDto } from './dto/update-runner-score-visibility.dto';
import {
   isPlausibleScore,
   isWorthKeeping,
   KEPT_RUNS_WINDOW_SECONDS,
   LEADERBOARD_SIZE,
   MAX_KEPT_RUNS_PER_DAY,
   MAX_KEPT_RUNS_PER_IP_PER_DAY,
   MAX_LEADERBOARD_RUNS_OVER_CAP_PER_DAY,
   MAX_RANK_COUNTED,
   MIN_KEPT_RUN_SECONDS,
   scoreEntersLeaderboard,
} from './runner-score.rules';

const RUN_KEY_PREFIX = 'runner-score:run:';
const RUN_CLOCK_GRACE_SECONDS = 3;
const RUN_TTL_SECONDS = 2 * 60 * 60;
const RUN_START_RATE_LIMIT = 240;
const SUBMIT_RATE_LIMIT = 240;
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;
export const KEPT_RUNS_KEY = 'runner-score:kept';
export const KEPT_LEADERBOARD_RUNS_KEY = 'runner-score:kept:leaderboard';
export const keptRunsByAddressKey = (ipAddress: string) => `runner-score:kept:ip:${ipAddress}`;

const TOP_PLAYERS_CACHE_KEY = 'runner-score:top:v2';
const TOP_PLAYERS_CACHE_SECONDS = 60;

type TopPlayers = { players: { nick: string; score: number; seconds: number }[] };

const SAVED_FIELDS = {
   id: true,
   nick: true,
   score: true,
   seconds: true,
   hidden: true,
   createdAt: true,
} as const;

@Injectable()
export class RunnerScoreService {
   private readonly logger = new Logger(RunnerScoreService.name);

   constructor(
      private prisma: PrismaService,
      private rateLimit: RateLimitService,
      private cache: CacheService,
      @Inject(REDIS_CLIENT) private redis: IORedis,
   ) {}

   async startRun(ipAddress: string) {
      await this.limit(
         `runner-score:run:${ipAddress}`,
         RUN_START_RATE_LIMIT,
         'Too many runs started',
      );
      const runId = randomUUID();
      await this.redis.set(`${RUN_KEY_PREFIX}${runId}`, Date.now(), 'EX', RUN_TTL_SECONDS);
      return { runId };
   }

   async submit(dto: CreateRunnerScoreDto, ipAddress: string) {
      await this.limit(
         `runner-score:submit:${ipAddress}`,
         SUBMIT_RATE_LIMIT,
         'Too many scores submitted',
      );

      const startedAt = await this.redis.getdel(`${RUN_KEY_PREFIX}${dto.runId}`);
      if (startedAt === null) {
         throw new BadRequestException('Run not found or already saved');
      }
      const secondsPassed = (Date.now() - Number(startedAt)) / 1000;
      if (dto.seconds > secondsPassed + RUN_CLOCK_GRACE_SECONDS) {
         throw new BadRequestException('Run claims more time than passed');
      }
      if (!isPlausibleScore(dto)) {
         throw new BadRequestException('Score is not possible for the time played');
      }
      if (!isWorthKeeping(dto)) {
         return { kept: false as const, minSeconds: MIN_KEPT_RUN_SECONDS };
      }
      const stored =
         (await this.countKeptRun(ipAddress)) || (await this.countLeaderboardRunOverCap(dto.score));
      if (!stored) {
         return { kept: false as const, minSeconds: MIN_KEPT_RUN_SECONDS };
      }

      const score = await this.prisma.runnerScore.create({
         data: { nick: dto.nick, score: dto.score, seconds: dto.seconds },
         select: SAVED_FIELDS,
      });
      const top = await this.cache.get<TopPlayers>(TOP_PLAYERS_CACHE_KEY);
      const last = top?.players[LEADERBOARD_SIZE - 1];
      if (top && (!last || score.score >= last.score)) {
         await this.cache.del(TOP_PLAYERS_CACHE_KEY);
      }
      return score;
   }

   async findTopPlayers() {
      const cached = await this.cache.get<TopPlayers>(TOP_PLAYERS_CACHE_KEY);
      if (cached) return cached;

      const players = await this.prisma.runnerScore.findMany({
         where: { hidden: false },
         orderBy: [{ score: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
         take: LEADERBOARD_SIZE,
         select: { nick: true, score: true, seconds: true },
      });
      const top = { players };
      await this.cache.set(TOP_PLAYERS_CACHE_KEY, top, TOP_PLAYERS_CACHE_SECONDS);
      return top;
   }

   async findRank(dto: RunnerRankQueryDto) {
      const ahead = await this.prisma.runnerScore.count({
         where: { hidden: false, score: { gte: dto.score } },
         take: MAX_RANK_COUNTED,
      });
      return { rank: ahead + 1 };
   }

   async findAll(query: PaginationQueryDto) {
      const where = buildSearchWhere(query.search, ['nick']);
      const [data, totalCount] = await this.prisma.$transaction([
         this.prisma.runnerScore.findMany({
            where,
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { score: 'score', seconds: 'seconds', nick: 'nick', createdAt: 'createdAt' },
               'createdAt',
            ),
         }),
         this.prisma.runnerScore.count({ where }),
      ]);
      return { data, totalCount };
   }

   async findStats(topSize = LEADERBOARD_SIZE) {
      const [totalRuns, top, latest] = await Promise.all([
         this.prisma.runnerScore.count(),
         this.prisma.runnerScore.findMany({
            where: { hidden: false },
            orderBy: [{ score: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
            take: topSize,
            select: SAVED_FIELDS,
         }),
         this.prisma.runnerScore.findFirst({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: SAVED_FIELDS,
         }),
      ]);
      return { totalRuns, top, latest };
   }

   async findOne(id: number) {
      const score = await this.prisma.runnerScore.findUnique({ where: { id } });
      if (!score) {
         throw new NotFoundException('Score not found');
      }
      return score;
   }

   async updateVisibility(id: number, dto: UpdateRunnerScoreVisibilityDto) {
      await this.findOne(id);
      const score = await this.prisma.runnerScore.update({
         where: { id },
         data: { hidden: dto.hidden },
      });
      await this.cache.del(TOP_PLAYERS_CACHE_KEY);
      return score;
   }

   async remove(id: number) {
      await this.findOne(id);
      await this.prisma.runnerScore.delete({ where: { id } });
      await this.cache.del(TOP_PLAYERS_CACHE_KEY);
   }

   private async countKeptRun(ipAddress: string) {
      const byAddress = await this.rateLimit.hit(
         keptRunsByAddressKey(ipAddress),
         MAX_KEPT_RUNS_PER_IP_PER_DAY,
         KEPT_RUNS_WINDOW_SECONDS,
      );
      if (!byAddress.allowed) return false;
      const all = await this.rateLimit.hit(
         KEPT_RUNS_KEY,
         MAX_KEPT_RUNS_PER_DAY,
         KEPT_RUNS_WINDOW_SECONDS,
      );
      this.warnWhenFirstOver(
         all,
         MAX_KEPT_RUNS_PER_DAY,
         'stored runs for all players',
         'only runs entering the leaderboard are stored',
      );
      return all.allowed;
   }

   private async countLeaderboardRunOverCap(score: number) {
      const { players } = await this.findTopPlayers();
      if (!scoreEntersLeaderboard(score, players)) return false;
      const limit = await this.rateLimit.hit(
         KEPT_LEADERBOARD_RUNS_KEY,
         MAX_LEADERBOARD_RUNS_OVER_CAP_PER_DAY,
         KEPT_RUNS_WINDOW_SECONDS,
      );
      this.warnWhenFirstOver(
         limit,
         MAX_LEADERBOARD_RUNS_OVER_CAP_PER_DAY,
         'runs stored over the daily numbers because they enter the leaderboard',
         'no more such run is stored',
      );
      return limit.allowed;
   }

   private warnWhenFirstOver(limit: RateLimitResult, max: number, what: string, then: string) {
      if (limit.count === max + 1) {
         this.logger.warn(
            `Runner score: the daily number of ${max} ${what} is reached; ${then} for the next ${limit.retryAfterSeconds} s`,
         );
      }
   }

   private async limit(key: string, max: number, message: string) {
      const limit = await this.rateLimit.hit(key, max, RATE_LIMIT_WINDOW_SECONDS);
      if (!limit.allowed) {
         throw new HttpException(
            {
               statusCode: HttpStatus.TOO_MANY_REQUESTS,
               message: `${message}. Please try again later.`,
               retryAfterSeconds: limit.retryAfterSeconds,
            },
            HttpStatus.TOO_MANY_REQUESTS,
         );
      }
   }
}
