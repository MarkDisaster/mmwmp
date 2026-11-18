import { cn } from '@mm/utils/cn';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import type { RunnerTopPlayer } from '@/api/generated/models/RunnerTopPlayer';
import CloseSvg from '@/assets/icons/close.svg';
import TrophySvg from '@/assets/icons/trophy.svg';

import {
   type LeaderboardEntry,
   type LeaderboardRow,
   leaderboardRows,
   NICK,
   TOP_PLAYERS,
} from '../api/scoreApi';
import { PixelText } from './PixelText';

const PODIUM = 3;

type TopPlayersListProps = {
   players: RunnerTopPlayer[] | undefined;
   pending: LeaderboardEntry;
   rank: number | undefined;
   onClose: () => void;
};

function LeaderboardItem({ row }: { row: LeaderboardRow }) {
   return (
      <li
         className={cn(
            'flex gap-2 tabular-nums',
            row.pending && 'bg-brand font-bold text-brand-foreground',
         )}
      >
         <span
            className={cn(
               'w-6 text-right',
               row.rank <= PODIUM && !row.pending
                  ? 'bg-brand px-0.5 font-bold text-brand-foreground'
                  : !row.pending && 'opacity-60',
            )}
         >
            {row.rank}.
         </span>
         <span className="font-bold tracking-widest">{row.nick}</span>
         <span className="ml-auto">{row.score}</span>
      </li>
   );
}

function EmptyItem({ rank }: { rank: number }) {
   return (
      <li className="flex gap-2 tabular-nums opacity-40">
         <span className={cn('w-6 text-right', rank <= PODIUM && 'font-bold')}>{rank}.</span>
         <span className="tracking-widest">___</span>
         <span className="ml-auto">–</span>
      </li>
   );
}

function TopPlayersList({ players, pending, rank, onClose }: TopPlayersListProps) {
   const t = useTranslations('RunnerGame');
   const rows = players && leaderboardRows(players, pending, rank);
   const below = rows?.[TOP_PLAYERS];
   const closeRef = useRef<HTMLButtonElement>(null);
   useEffect(() => closeRef.current?.focus(), []);
   return (
      <span className="flex min-w-60 flex-col gap-1.5">
         <span className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[11px] font-bold">
               <TrophySvg className="size-3" aria-hidden />
               {t('topPlayers')}
            </span>
            <button
               ref={closeRef}
               type="button"
               className="cursor-pointer p-0.5 text-foreground"
               aria-label={t('closeTopPlayers')}
               title={t('closeTopPlayers')}
               onClick={onClose}
            >
               <CloseSvg className="size-2.5" aria-hidden />
            </button>
         </span>
         {rows === undefined ? (
            <span className="opacity-60">{t('topUnavailable')}</span>
         ) : (
            <>
               <ol className="grid grid-flow-col grid-rows-5 gap-x-6 gap-y-0.5">
                  {rows.slice(0, TOP_PLAYERS).map((row) => (
                     <LeaderboardItem key={`${row.rank}-${row.nick}`} row={row} />
                  ))}
                  {Array.from({ length: Math.max(0, TOP_PLAYERS - rows.length) }, (_, i) => (
                     <EmptyItem key={`empty-${i}`} rank={rows.length + i + 1} />
                  ))}
               </ol>
               {below && (
                  <ol className="grid grid-cols-2 gap-x-6 border-t border-foreground/30 pt-1">
                     <LeaderboardItem row={below} />
                  </ol>
               )}
            </>
         )}
      </span>
   );
}

function NickField({
   nick,
   onNickChange,
   onRetryKey,
   onQuit,
   autoFocus,
}: Pick<EndPanelProps, 'nick' | 'onNickChange' | 'onRetryKey' | 'onQuit'> & {
   autoFocus: boolean;
}) {
   const t = useTranslations('RunnerGame');
   const id = useId();
   const hintId = useId();
   const inputRef = useRef<HTMLInputElement>(null);
   const focusingClick = useRef(false);
   useEffect(() => {
      if (autoFocus) inputRef.current?.focus({ preventScroll: true });
   }, [autoFocus]);
   const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === ' ') {
         event.preventDefault();
         if (!event.repeat) onRetryKey();
      } else if (event.key === 'Escape') {
         event.preventDefault();
         onQuit();
      }
   };

   return (
      <span className="flex items-center gap-2 md:flex-col md:items-start md:gap-0">
         <label htmlFor={id} className="text-[11px] opacity-60">
            {t('nick')}
         </label>
         <input
            ref={inputRef}
            id={id}
            value={nick}
            onChange={(event) =>
               onNickChange(
                  event.target.value
                     .toUpperCase()
                     .replace(/[^A-Z0-9]/g, '')
                     .slice(0, 3),
               )
            }
            onKeyDown={onKeyDown}
            onFocus={(event) => event.currentTarget.select()}
            onMouseDown={(event) => {
               focusingClick.current = document.activeElement !== event.currentTarget;
            }}
            onMouseUp={(event) => {
               if (focusingClick.current) event.preventDefault();
               focusingClick.current = false;
            }}
            maxLength={3}
            placeholder="AAA"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-describedby={hintId}
            className="w-[4.5ch] border-b-2 border-foreground bg-transparent text-base font-bold tracking-widest uppercase outline-none placeholder:opacity-30 focus:border-brand md:mt-1 md:text-sm"
         />
         <span id={hintId} className="sr-only">
            {t('nickHint')}
         </span>
      </span>
   );
}

type EndPanelProps = {
   touch: boolean;
   score: number;
   newRecord: boolean;
   nick: string;
   onNickChange: (nick: string) => void;
   topPlayers: RunnerTopPlayer[] | undefined;
   rank: number | undefined;
   onRetry: () => void;
   onRetryKey: () => void;
   onQuit: () => void;
};

type ResultViewProps = Omit<EndPanelProps, 'topPlayers'> & {
   onShowTop: () => void;
   focusTrophy: boolean;
};

function ResultView({
   touch,
   score,
   rank,
   newRecord,
   nick,
   onNickChange,
   onRetry,
   onRetryKey,
   onQuit,
   onShowTop,
   focusTrophy,
}: ResultViewProps) {
   const t = useTranslations('RunnerGame');
   const trophyRef = useRef<HTMLButtonElement>(null);
   useEffect(() => {
      if (focusTrophy) trophyRef.current?.focus();
   }, [focusTrophy]);
   return (
      <span className="flex flex-col gap-1 max-md:items-end md:gap-2">
         <span className="flex items-center gap-4 md:items-start md:justify-between">
            <span className="flex items-center gap-2 md:flex-col md:items-start md:gap-0">
               <span className="text-[11px] opacity-60">{t('rank')}</span>
               {rank === undefined ? (
                  <span className="text-sm opacity-40 md:mt-1">…</span>
               ) : (
                  <PixelText text={`${rank}.`} className="h-3.5 w-auto md:mt-1 md:h-[21px]" />
               )}
            </span>
            <NickField
               nick={nick}
               onNickChange={onNickChange}
               onRetryKey={onRetryKey}
               onQuit={onQuit}
               autoFocus={!touch && !focusTrophy}
            />
            <span className="flex items-center gap-2 md:flex-col md:items-start md:gap-0">
               <span
                  className={cn(
                     'text-[11px] opacity-60',
                     newRecord &&
                        'max-md:bg-brand max-md:px-1 max-md:font-bold max-md:text-brand-foreground max-md:opacity-100',
                  )}
               >
                  <span className="md:hidden">{newRecord ? t('newRecord') : t('score')}</span>
                  <span className="max-md:hidden">{t('score')}</span>
               </span>
               <PixelText text={String(score)} className="h-3.5 w-auto md:mt-1 md:h-[21px]" />
            </span>
         </span>
         <span className="flex gap-1.5">
            <button
               type="button"
               className="cursor-pointer border-2 border-b-4 border-brand bg-brand px-2 py-0.5 font-bold text-brand-foreground md:flex-1 md:px-3"
               aria-label={touch ? undefined : t('retry')}
               title={touch ? undefined : t('retry')}
               onClick={onRetry}
            >
               {touch ? t('retry') : 'SPACE'}
            </button>
            <button
               type="button"
               className="cursor-pointer border-2 border-b-4 border-foreground px-2 py-0.5 font-bold text-foreground md:flex-1 md:px-3"
               aria-label={touch ? undefined : t('quit')}
               title={touch ? undefined : t('quit')}
               onClick={onQuit}
            >
               {touch ? t('quit') : 'ESC'}
            </button>
            <button
               ref={trophyRef}
               type="button"
               className="flex cursor-pointer items-center border-2 border-b-4 border-foreground px-1.5 text-foreground"
               aria-label={t('showTopPlayers')}
               title={t('showTopPlayers')}
               onClick={onShowTop}
            >
               <TrophySvg className="size-3" aria-hidden />
            </button>
         </span>
      </span>
   );
}

export function EndPanel({
   touch,
   score,
   newRecord,
   nick,
   onNickChange,
   topPlayers,
   rank,
   onRetry,
   onRetryKey,
   onQuit,
}: EndPanelProps) {
   const t = useTranslations('RunnerGame');
   const [showTop, setShowTop] = useState(false);
   const [closedTop, setClosedTop] = useState(false);
   return (
      <div
         data-game-ui
         className={cn(
            'pointer-events-auto relative flex cursor-default border-2 bg-background text-xs leading-tight text-foreground max-md:flex-col max-md:items-end max-md:gap-1 max-md:px-2 max-md:py-1 md:w-70 md:flex-col md:border-3 md:px-4 md:py-2',
            newRecord ? 'border-brand' : 'border-foreground',
         )}
      >
         {newRecord && (
            <span className="absolute -inset-x-[3px] bottom-full hidden bg-brand py-px text-center text-[11px] font-bold text-brand-foreground md:block">
               {t('newRecord')}
            </span>
         )}
         {showTop ? (
            <TopPlayersList
               players={topPlayers}
               pending={{ nick: NICK.test(nick) ? nick : '???', score }}
               rank={rank}
               onClose={() => {
                  setShowTop(false);
                  setClosedTop(true);
               }}
            />
         ) : (
            <ResultView
               touch={touch}
               score={score}
               rank={rank}
               newRecord={newRecord}
               nick={nick}
               onNickChange={onNickChange}
               onRetry={onRetry}
               onRetryKey={onRetryKey}
               onQuit={onQuit}
               onShowTop={() => setShowTop(true)}
               focusTrophy={closedTop}
            />
         )}
      </div>
   );
}
