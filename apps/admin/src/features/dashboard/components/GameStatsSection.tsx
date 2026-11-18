import { cn } from '@mm/utils/cn';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { RunnerScoreEntity } from '@/api/generated';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCount, formatRunTime } from '@/features/dashboard/utils/auroraStats';
import { usePermission } from '@/hooks/usePermission';
import { formatRelativeDate } from '@/utils/date';

const TOP_LIMIT = 10;
const PLACES_PER_COLUMN = TOP_LIMIT / 2;

type TopPlayer = Pick<RunnerScoreEntity, 'nick' | 'score' | 'seconds' | 'hidden'>;

type Place = { rank: number; player: TopPlayer | undefined };

const HEAD_CELL = 'text-muted-foreground py-1 text-xs font-medium tracking-wide uppercase';

const toColumns = (players: TopPlayer[]): Place[][] =>
   [0, 1].map((column) =>
      Array.from({ length: PLACES_PER_COLUMN }, (_, row) => {
         const index = column * PLACES_PER_COLUMN + row;
         return { rank: index + 1, player: players[index] };
      }),
   );

export const GameStatsSection = () => {
   const { t, i18n } = useTranslation();
   const locale = i18n.language;
   const canRead = usePermission('runner_scores', 'read');

   const topQuery = useQuery({
      ...api.runnerScores.queries.all({ limit: TOP_LIMIT, sortBy: 'score', sortOrder: 'desc' }),
      enabled: canRead,
   });
   const lastQuery = useQuery({
      ...api.runnerScores.queries.all({ limit: 1, sortBy: 'createdAt', sortOrder: 'desc' }),
      enabled: canRead,
   });

   if (!canRead) return null;

   const players = [...(topQuery.data?.data ?? [])].sort(
      (a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt) || a.id - b.id,
   );
   const columns = toColumns(players);
   const last = lastQuery.data?.data[0];
   const footerLoading = topQuery.isLoading || lastQuery.isLoading;
   const footerFailed = topQuery.isError || lastQuery.isError;

   return (
      <div className="space-y-3">
         <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Gamepad2 className="h-5 w-5" />
            {t('dashboard.game.title')}
         </h2>

         <Card>
            <CardHeader>
               <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.game.topPlayers')}
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {topQuery.isLoading ? (
                  <Skeleton className="h-32 w-full" />
               ) : topQuery.isError ? (
                  <QueryErrorState
                     onRetry={() => void topQuery.refetch()}
                     isRetrying={topQuery.isFetching}
                  />
               ) : players.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('dashboard.game.empty')}</p>
               ) : (
                  <div className="grid gap-x-8 sm:grid-cols-2">
                     {columns.map((rows, columnIndex) => (
                        <table
                           key={columnIndex}
                           className={cn(
                              'w-full table-fixed text-sm',
                              !rows[0]?.player && 'max-sm:hidden',
                           )}
                        >
                           <colgroup>
                              <col className="w-8" />
                              <col />
                              <col className="w-16" />
                              <col className="w-20" />
                           </colgroup>
                           <thead className={cn(columnIndex > 0 && 'max-sm:sr-only')}>
                              <tr>
                                 <th
                                    scope="col"
                                    className={cn(HEAD_CELL, 'text-left')}
                                    aria-label={t('dashboard.game.rank')}
                                 >
                                    #
                                 </th>
                                 <th scope="col" className={cn(HEAD_CELL, 'text-left')}>
                                    {t('dashboard.game.player')}
                                 </th>
                                 <th scope="col" className={cn(HEAD_CELL, 'text-right')}>
                                    {t('dashboard.game.time')}
                                 </th>
                                 <th scope="col" className={cn(HEAD_CELL, 'text-right')}>
                                    {t('dashboard.game.score')}
                                 </th>
                              </tr>
                           </thead>
                           <tbody>
                              {rows.map(({ rank, player }) =>
                                 player ? (
                                    <tr key={rank}>
                                       <td className="py-1 text-muted-foreground">{rank}.</td>
                                       <td className="truncate py-1 pr-2 font-medium">
                                          {player.nick}
                                          {player.hidden && (
                                             <Badge variant="secondary" className="ml-2">
                                                {t('runnerScores.hidden')}
                                             </Badge>
                                          )}
                                       </td>
                                       <td className="py-1 text-right text-muted-foreground tabular-nums">
                                          {formatRunTime(player.seconds) ?? '–'}
                                       </td>
                                       <td className="py-1 text-right font-semibold tabular-nums">
                                          {formatCount(player.score, locale)}
                                       </td>
                                    </tr>
                                 ) : (
                                    <tr
                                       key={rank}
                                       className="text-muted-foreground/50 max-sm:hidden"
                                    >
                                       <td className="py-1">{rank}.</td>
                                       <td className="py-1">–</td>
                                       <td className="py-1 text-right">–</td>
                                       <td className="py-1 text-right">–</td>
                                    </tr>
                                 ),
                              )}
                           </tbody>
                        </table>
                     ))}
                  </div>
               )}

               <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm text-muted-foreground">
                  {footerFailed ? (
                     <span className="text-destructive">{t('dashboard.game.error')}</span>
                  ) : footerLoading ? (
                     <Skeleton className="h-5 w-full" />
                  ) : (
                     <>
                        <span>
                           {t('dashboard.game.totalScores')}:{' '}
                           <span className="font-medium text-foreground">
                              {formatCount(topQuery.data?.totalCount ?? 0, locale)}
                           </span>
                        </span>
                        {last && (
                           <span className="flex items-center gap-2">
                              {t('dashboard.game.lastScore')}:{' '}
                              <span className="font-medium text-foreground">
                                 {last.nick} · {formatCount(last.score, locale)} ·{' '}
                                 {formatRelativeDate(last.createdAt, locale)}
                              </span>
                              {last.hidden && (
                                 <Badge variant="secondary">{t('runnerScores.hidden')}</Badge>
                              )}
                           </span>
                        )}
                     </>
                  )}
               </div>
            </CardContent>
         </Card>
      </div>
   );
};
