import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ClientIp } from '@/common/decorators/client-ip.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';

import { CreateRunnerScoreDto } from './dto/create-runner-score.dto';
import { RunnerRankQueryDto } from './dto/runner-rank-query.dto';
import { RunnerRankEntity } from './entity/runner-rank.entity';
import { RunnerRateLimitedEntity } from './entity/runner-rate-limited.entity';
import { RunnerRunEntity } from './entity/runner-run.entity';
import { RunnerScoreEntity } from './entity/runner-score.entity';
import { RunnerScoreNotKeptEntity } from './entity/runner-score-not-kept.entity';
import { RunnerTopPlayersEntity } from './entity/runner-top-players.entity';
import { RunnerScoreService } from './runner-score.service';

@ApiTags('Public - Runner scores')
@Controller('public/runner-scores')
export class RunnerScorePublicController {
   constructor(private runnerScoreService: RunnerScoreService) {}

   @Get('top')
   @ApiOperation({ summary: 'The leaderboard: the 10 best players, each with their best score' })
   @ApiResponse({
      status: 200,
      description: 'Best players, highest first',
      type: RunnerTopPlayersEntity,
   })
   findTopPlayers() {
      return this.runnerScoreService.findTopPlayers();
   }

   @Get('rank')
   @ApiOperation({ summary: 'The place a score would take on the leaderboard' })
   @ApiResponse({ status: 200, description: 'Rank from 1', type: RunnerRankEntity })
   @ApiResponse({ status: 400, description: 'Invalid score', type: ErrorResponseDto })
   findRank(@Query() query: RunnerRankQueryDto) {
      return this.runnerScoreService.findRank(query);
   }

   @Post('runs')
   @ApiOperation({ summary: 'Start a run: its score may later claim only the time passed since' })
   @ApiResponse({ status: 201, description: 'Run started', type: RunnerRunEntity })
   @ApiResponse({
      status: 429,
      description: 'Too many runs started',
      type: RunnerRateLimitedEntity,
   })
   startRun(@ClientIp() ipAddress: string) {
      return this.runnerScoreService.startRun(ipAddress);
   }

   @Post()
   @ApiOperation({ summary: 'Save a score from the runner game with the player nickname' })
   @ApiResponse({ status: 201, description: 'Score saved', type: RunnerScoreEntity })
   @ApiResponse({
      status: 200,
      description:
         'A valid run accepted but not stored: shorter than `minSeconds`, or over the daily number of stored runs and not entering the leaderboard',
      type: RunnerScoreNotKeptEntity,
   })
   @ApiResponse({
      status: 400,
      description: 'Invalid nickname, an unknown or used run, or an impossible score',
      type: ErrorResponseDto,
   })
   @ApiResponse({
      status: 429,
      description: 'Too many scores submitted',
      type: RunnerRateLimitedEntity,
   })
   async submit(
      @Body() dto: CreateRunnerScoreDto,
      @ClientIp() ipAddress: string,
      @Res({ passthrough: true }) response: Response,
   ) {
      const result = await this.runnerScoreService.submit(dto, ipAddress);
      if ('kept' in result) response.status(HttpStatus.OK);
      return result;
   }
}
