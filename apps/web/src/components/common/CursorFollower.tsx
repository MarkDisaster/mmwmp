'use client';

import { m, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState, useSyncExternalStore } from 'react';

const CURSOR_SIZE = 700;

const GLOW_SCALE = Math.sqrt(4 / 3) * 1.25 * 1.25;
const GLOW_SIZE = 1300 * GLOW_SCALE;
const GLOW_ALPHA = [
   0.1499, 0.1497, 0.1485, 0.1448, 0.136, 0.1196, 0.0952, 0.0662, 0.0392, 0.0192, 0.0077, 0.0024,
   0.0005, 0,
];
const GLOW_SAMPLE_STEP = 50;
const GLOW_STOP_STEP = 5;
const GLOW_HALO = 0.64;
const GLOW_CORE = 0.12;
const GLOW_CORE_RADIUS = 180;
const GLOW_RADIUS = (GLOW_ALPHA.length - 1) * GLOW_SAMPLE_STEP;

function glowSlopes(): number[] {
   const secants = GLOW_ALPHA.slice(1).map(
      (alpha, i) => (alpha - GLOW_ALPHA[i]) / GLOW_SAMPLE_STEP,
   );
   return GLOW_ALPHA.map((_, i) => {
      if (i === 0 || i === GLOW_ALPHA.length - 1) return 0;
      const [before, after] = [secants[i - 1], secants[i]];
      return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
   });
}

function glowAlphaAt(radius: number, slopes: number[]): number {
   const i = Math.min(Math.floor(radius / GLOW_SAMPLE_STEP), GLOW_ALPHA.length - 2);
   const t = (radius - i * GLOW_SAMPLE_STEP) / GLOW_SAMPLE_STEP;
   const [t2, t3] = [t * t, t * t * t];
   return (
      (2 * t3 - 3 * t2 + 1) * GLOW_ALPHA[i] +
      (t3 - 2 * t2 + t) * GLOW_SAMPLE_STEP * slopes[i] +
      (-2 * t3 + 3 * t2) * GLOW_ALPHA[i + 1] +
      (t3 - t2) * GLOW_SAMPLE_STEP * slopes[i + 1]
   );
}

function glowGradient(halo: number, core: number): string {
   const slopes = glowSlopes();
   const stops = Array.from({ length: GLOW_RADIUS / GLOW_STOP_STEP + 1 }, (_, i) => {
      const radius = i * GLOW_STOP_STEP;
      const heart = core * Math.exp(-((radius / GLOW_CORE_RADIUS) ** 2));
      const alpha = Math.max(0, halo * glowAlphaAt(radius, slopes) + heart);
      const colour = `color-mix(in srgb, var(--brand) ${(alpha * 100).toFixed(3)}%, transparent)`;
      return `${colour} ${((radius / GLOW_RADIUS) * 100).toFixed(2)}%`;
   });
   return `radial-gradient(closest-side, ${stops.join(', ')})`;
}

const GLOW_GRADIENT = glowGradient(GLOW_HALO, GLOW_CORE);

const GRAIN_IMAGE =
   "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeComponentTransfer%3E%3CfeFuncR type='linear' slope='0.4'/%3E%3CfeFuncG type='linear' slope='0.4'/%3E%3CfeFuncB type='linear' slope='0.4'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
const GRAIN_OPACITY = 0.05;

const GLOW_QUERY = '(pointer: fine) and (prefers-reduced-motion: no-preference)';
const matchesGlowQuery = () => window.matchMedia(GLOW_QUERY).matches;
function subscribeGlowQuery(onChange: () => void): () => void {
   const query = window.matchMedia(GLOW_QUERY);
   query.addEventListener('change', onChange);
   return () => query.removeEventListener('change', onChange);
}

function CursorGlow() {
   const [isVisible, setIsVisible] = useState(false);

   const mouseX = useMotionValue(0);
   const mouseY = useMotionValue(0);

   const springX = useSpring(mouseX, { damping: 75, stiffness: 50 });
   const springY = useSpring(mouseY, { damping: 75, stiffness: 50 });

   useEffect(() => {
      document.documentElement.dataset.cursorGrain = '';
      return () => {
         delete document.documentElement.dataset.cursorGrain;
      };
   }, []);

   useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
         mouseX.set(e.clientX - CURSOR_SIZE / 2);
         mouseY.set(e.clientY - CURSOR_SIZE / 2);
         setIsVisible(true);
      };

      const handleMouseLeave = () => setIsVisible(false);
      const handleMouseEnter = () => setIsVisible(true);

      window.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('mouseenter', handleMouseEnter);

      return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         document.removeEventListener('mouseleave', handleMouseLeave);
         document.removeEventListener('mouseenter', handleMouseEnter);
      };
   }, [mouseX, mouseY]);

   return (
      <>
         <m.div
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 z-30"
            style={{
               width: CURSOR_SIZE,
               height: CURSOR_SIZE,
               x: springX,
               y: springY,
               opacity: isVisible ? 1 : 0,
            }}
         >
            <div
               className="absolute"
               style={{
                  width: GLOW_SIZE,
                  height: GLOW_SIZE,
                  left: (CURSOR_SIZE - GLOW_SIZE) / 2,
                  top: (CURSOR_SIZE - GLOW_SIZE) / 2,
                  backgroundImage: GLOW_GRADIENT,
               }}
            />
         </m.div>
         <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-100 hidden dark:block"
            style={{ opacity: GRAIN_OPACITY, backgroundImage: GRAIN_IMAGE }}
         />
      </>
   );
}

export function CursorFollower() {
   const isEnabled = useSyncExternalStore(subscribeGlowQuery, matchesGlowQuery, () => false);

   return isEnabled ? <CursorGlow /> : null;
}
