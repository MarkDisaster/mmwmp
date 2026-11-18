import type { CreateRunnerScoreDto } from '@/api/generated/models/CreateRunnerScoreDto';
import type { RunnerRankEntity } from '@/api/generated/models/RunnerRankEntity';
import type { RunnerRunEntity } from '@/api/generated/models/RunnerRunEntity';
import type { RunnerTopPlayer } from '@/api/generated/models/RunnerTopPlayer';
import type { RunnerTopPlayersEntity } from '@/api/generated/models/RunnerTopPlayersEntity';

const SCORES_URL = `${process.env.NEXT_PUBLIC_API_URL}/public/runner-scores`;

export const NICK = /^[A-Z0-9]{1,3}$/;

export const DEFAULT_NICK = 'DOE';

export type SubmitResult = 'saved' | 'rejected' | 'limited' | 'failed';

export async function startRun(): Promise<string | undefined> {
   try {
      const response = await fetch(`${SCORES_URL}/runs`, { method: 'POST' });
      if (!response.ok) return undefined;
      const body: RunnerRunEntity = await response.json();
      return body.runId;
   } catch {
      return undefined;
   }
}

export async function submitScore(submission: CreateRunnerScoreDto): Promise<SubmitResult> {
   try {
      const response = await fetch(SCORES_URL, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(submission),
         keepalive: true,
      });
      if (response.ok) return 'saved';
      if (response.status === 429) return 'limited';
      if (response.status === 400) return 'rejected';
      return 'failed';
   } catch {
      return 'failed';
   }
}

export async function fetchTopPlayers(): Promise<RunnerTopPlayer[] | undefined> {
   try {
      const response = await fetch(`${SCORES_URL}/top`);
      if (!response.ok) return undefined;
      const body: RunnerTopPlayersEntity = await response.json();
      return body.players;
   } catch {
      return undefined;
   }
}

export async function fetchRank(score: number): Promise<number | undefined> {
   try {
      const response = await fetch(`${SCORES_URL}/rank?score=${score}`);
      if (!response.ok) return undefined;
      const body: RunnerRankEntity = await response.json();
      return body.rank;
   } catch {
      return undefined;
   }
}

export const TOP_PLAYERS = 10;

export type LeaderboardEntry = Pick<RunnerTopPlayer, 'nick' | 'score'>;

export type LeaderboardRow = LeaderboardEntry & { rank: number; pending?: boolean };

export function leaderboardRows(
   players: LeaderboardEntry[],
   pending: LeaderboardEntry,
   pendingRank?: number,
): LeaderboardRow[] {
   const ahead = players.filter((player) => player.score >= pending.score).length;
   const rows: (LeaderboardEntry & { pending?: boolean })[] = [...players];
   rows.splice(ahead, 0, { ...pending, pending: true });
   const top = rows.slice(0, TOP_PLAYERS).map((row, index) => ({ ...row, rank: index + 1 }));
   if (ahead < TOP_PLAYERS) return top;
   const shown = players
      .slice(0, TOP_PLAYERS)
      .map((player, index) => ({ ...player, rank: index + 1 }));
   return [...shown, { ...pending, pending: true, rank: pendingRank ?? ahead + 1 }];
}
