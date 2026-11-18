'use client';

import { cn } from '@mm/utils/cn';
import { useTranslations } from 'next-intl';
import {
   type RefObject,
   useCallback,
   useEffect,
   useId,
   useRef,
   useState,
   useSyncExternalStore,
} from 'react';

import type { RunnerTopPlayer } from '@/api/generated/models/RunnerTopPlayer';

import {
   DEFAULT_NICK,
   fetchRank,
   fetchTopPlayers,
   NICK,
   startRun,
   submitScore,
} from '../api/scoreApi';
import {
   HEADROOM,
   IDLE_BUBBLE_DROP,
   IDLE_BUBBLE_GAP,
   ROBOT_GROUND_Y,
   ROBOT_SIZE,
   ROBOT_X,
   WORLD_HEIGHT,
} from '../engine/constants';
import { isVersionLabel } from '../engine/phaseLabel';
import { useGameLabels } from '../hooks/useGameLabels';
import type { Colors, Game, GameOverInfo, Hud } from '../runtime/game';
import { readNick, saveNick } from '../runtime/storage';
import { EndPanel } from './EndPanel';

const FALLBACK_COLORS: Colors = { fg: '#000000', brand: '#0130fe', brandFg: '#ffffff' };

const COARSE_POINTER_QUERY = '(pointer: coarse)';
const isCoarsePointer = () => window.matchMedia(COARSE_POINTER_QUERY).matches;
function subscribeCoarsePointer(onChange: () => void): () => void {
   const query = window.matchMedia(COARSE_POINTER_QUERY);
   query.addEventListener('change', onChange);
   return () => query.removeEventListener('change', onChange);
}

type RunnerGameProps = {
   startDelaySeconds?: number;
   skipIntro?: boolean;
   touchAreaRef?: RefObject<HTMLElement | null>;
};

export function RunnerGame({
   startDelaySeconds = 0,
   skipIntro = false,
   touchAreaRef,
}: RunnerGameProps) {
   const t = useTranslations('RunnerGame');
   const wrapperRef = useRef<HTMLDivElement>(null);
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const gameRef = useRef<Game | null>(null);
   const colorsRef = useRef<Colors>(FALLBACK_COLORS);
   const labels = useGameLabels();
   const labelsRef = useRef(labels);
   const [started, setStarted] = useState(false);
   const [introDone, setIntroDone] = useState(skipIntro);
   const isTouch = useSyncExternalStore(subscribeCoarsePointer, isCoarsePointer, () => false);
   const [hud, setHud] = useState<Hud>({ score: 0, best: null, phase: 'planning' });
   const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
   const [resumeHint, setResumeHint] = useState(false);
   const controlsId = useId();
   const [nick, setNick] = useState(DEFAULT_NICK);
   const [topPlayers, setTopPlayers] = useState<RunnerTopPlayer[] | undefined>(undefined);
   const bestRef = useRef<RunnerTopPlayer | null | undefined>(undefined);
   const loadTopPlayers = useCallback(async () => {
      const players = await fetchTopPlayers();
      setTopPlayers(players);
      bestRef.current = players && (players[0] ?? null);
      gameRef.current?.setBestScore(bestRef.current);
   }, []);
   useEffect(() => {
      void loadTopPlayers();
   }, [loadTopPlayers]);
   const [rank, setRank] = useState<number | undefined>(undefined);
   const finishedScore = gameOver?.score;
   useEffect(() => {
      setRank(undefined);
      if (finishedScore === undefined) return;
      let current = true;
      void fetchRank(finishedScore).then((place) => {
         if (current) setRank(place);
      });
      return () => {
         current = false;
      };
   }, [finishedScore, gameOver]);
   const runRef = useRef<{ id?: string; started: Promise<string | undefined> } | null>(null);
   const nickRef = useRef(nick);
   useEffect(() => setNick(readNick() || DEFAULT_NICK), []);
   useEffect(() => {
      nickRef.current = nick;
   }, [nick]);

   useEffect(() => {
      labelsRef.current = labels;
      gameRef.current?.setLabels(labels);
   }, [labels]);

   useEffect(() => {
      const root = document.documentElement;
      const readColors = () => {
         const styles = getComputedStyle(root);
         const token = (name: string) => styles.getPropertyValue(name).trim();
         colorsRef.current = {
            fg: token('--foreground') || FALLBACK_COLORS.fg,
            brand: token('--brand') || FALLBACK_COLORS.brand,
            brandFg: token('--brand-foreground') || FALLBACK_COLORS.brandFg,
         };
         gameRef.current?.setColors(colorsRef.current);
      };
      readColors();
      const themeObserver = new MutationObserver(readColors);
      themeObserver.observe(root, {
         attributes: true,
         attributeFilter: ['class', 'style', 'data-theme'],
      });
      return () => themeObserver.disconnect();
   }, []);

   useEffect(() => {
      const canvas = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper || !canvas.getContext('2d')) return;
      let game: Game | null = null;
      let unmounted = false;
      const mount = ({ Game: GameClass }: { Game: typeof Game }) => {
         if (unmounted) return;
         game = new GameClass(
            canvas,
            wrapper,
            { startDelaySeconds, skipIntro, touchArea: touchAreaRef?.current ?? undefined },
            {
               onHud: setHud,
               onStarted: setStarted,
               onGameOver: setGameOver,
               onResumeHint: setResumeHint,
               onIntroDone: () => setIntroDone(true),
               onRunStarted: () => {
                  const run: { id?: string; started: Promise<string | undefined> } = {
                     started: startRun(),
                  };
                  void run.started.then((id) => {
                     run.id = id;
                  });
                  runRef.current = run;
               },
               onResultLeft: ({ score, seconds }) => {
                  const run = runRef.current;
                  runRef.current = null;
                  const name = nickRef.current;
                  if (!run || !NICK.test(name)) return;
                  saveNick(name);
                  const save = (runId: string | undefined) => {
                     if (!runId) return;
                     void submitScore({ runId, nick: name, score, seconds }).then((result) => {
                        if (result === 'saved') void loadTopPlayers();
                     });
                  };
                  if (run.id) save(run.id);
                  else void run.started.then(save);
               },
            },
         );
         game.setColors(colorsRef.current);
         game.setLabels(labelsRef.current);
         game.setBestScore(bestRef.current);
         gameRef.current = game;
      };
      void import('../runtime/game').then(mount, () => undefined);
      return () => {
         unmounted = true;
         game?.dispose();
         gameRef.current = null;
      };
   }, [startDelaySeconds, skipIntro, touchAreaRef, loadTopPlayers]);

   const active = started || gameOver !== null;

   return (
      <div
         ref={wrapperRef}
         tabIndex={0}
         role="application"
         data-nosnippet
         aria-label={t('ariaLabel')}
         aria-describedby={controlsId}
         className={cn(
            'relative mb-2 -ml-2.5 flex flex-1 flex-col justify-end overflow-visible font-mono transition-[max-height] duration-300 ease-out outline-none select-none',
            !active &&
               'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand focus-visible:outline-solid',
            active ? 'max-h-44 md:max-h-37.5' : 'max-h-14',
         )}
      >
         {active && (
            <div className="z-10 flex justify-end gap-3 pr-1 pb-1 text-xs md:absolute md:top-0 md:right-0">
               {gameOver ? (
                  <EndPanel
                     touch={isTouch}
                     score={gameOver.score}
                     nick={nick}
                     onNickChange={setNick}
                     topPlayers={topPlayers}
                     rank={rank}
                     newRecord={gameOver.newRecord}
                     onRetry={() => gameRef.current?.retry()}
                     onRetryKey={() => gameRef.current?.retryAfterCooldown()}
                     onQuit={() => gameRef.current?.quit()}
                  />
               ) : (
                  <>
                     <span className="opacity-50">
                        {isVersionLabel(hud.phase) ? hud.phase : t(`phases.${hud.phase}.name`)}
                     </span>
                     <span>
                        <span className="opacity-50">{t('score')}</span> {hud.score}
                     </span>
                     {hud.best && (
                        <span>
                           <span className="opacity-50">{t('record')}</span> {hud.best.score}{' '}
                           <span className="opacity-50">{hud.best.nick}</span>
                        </span>
                     )}
                  </>
               )}
            </div>
         )}
         <div className="relative mb-[0.5px]">
            <canvas
               ref={canvasRef}
               className="pointer-events-none block w-full [--s:2] md:[--s:3]"
               style={{
                  height: `calc(${WORLD_HEIGHT + HEADROOM} * var(--s) * 1px)`,
                  marginTop: `calc(${-HEADROOM} * var(--s) * 1px)`,
               }}
               aria-hidden
            />
            {!active && introDone && (
               <div
                  className="pointer-events-none absolute bg-brand px-2 py-1 text-xs whitespace-nowrap text-brand-foreground [--s:2] md:[--s:3]"
                  style={{
                     left: `calc(${ROBOT_X + ROBOT_SIZE + IDLE_BUBBLE_GAP} * var(--s) * 1px)`,
                     bottom: `calc(${WORLD_HEIGHT - ROBOT_GROUND_Y - IDLE_BUBBLE_DROP} * var(--s) * 1px)`,
                  }}
               >
                  {t(isTouch ? 'pressStartTouch' : 'pressStart')}
                  <span className="absolute bottom-1.5 -left-1 size-2 rotate-45 bg-brand" />
               </div>
            )}
            {resumeHint && (
               <div className="pointer-events-none absolute top-1 left-1/2 -translate-x-1/2 bg-brand px-2 py-1 text-xs whitespace-nowrap text-brand-foreground md:top-3">
                  {t(isTouch ? 'resumeTouch' : 'resume')}
               </div>
            )}
            <p id={controlsId} className="sr-only">
               {t(isTouch ? 'controlsTouch' : 'controls')}
            </p>
            <p className="sr-only" aria-live="polite">
               {gameOver &&
                  `${gameOver.line} ${t('result', { score: gameOver.score })}${gameOver.newRecord ? ` ${t('newRecord')}.` : ''}`}
            </p>
            {gameOver && (
               <div
                  className="pointer-events-none absolute inset-0 text-xs leading-tight"
                  aria-hidden
               >
                  <div
                     className="absolute max-w-[55%] bg-brand px-2 py-1 text-brand-foreground md:max-w-none md:whitespace-nowrap"
                     style={{ left: gameOver.bubbleLeft, bottom: gameOver.bubbleBottom }}
                  >
                     {gameOver.line}
                     <span
                        className={cn(
                           'absolute size-2 rotate-45 bg-brand',
                           gameOver.bubbleBeside ? 'bottom-1.5 -left-1' : '-bottom-1 left-3',
                        )}
                     />
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}
