'use client';

import { useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

import LogoSvg from '@/assets/icons/logo-animated.svg';

const ANIMATION_SPEED = 600;
const LAST_FRAME = 20;

export function LogoAnimated() {
   const containerRef = useRef<HTMLSpanElement>(null);
   const imagesRef = useRef<HTMLCollection | null>(null);
   const stopRef = useRef(0);
   const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
   const prefersReducedMotion = useReducedMotion();

   useEffect(() => {
      if (!containerRef.current) return;

      const svg = containerRef.current.querySelector('svg');
      if (!svg) return;

      svg.style.width = '100%';
      svg.style.height = 'auto';

      imagesRef.current = svg.children;
      stopAnimation();

      return () => clearTimeout(timerRef.current);
   }, []);

   const animation = (i: number) => {
      if (stopRef.current === 1) return;
      const images = imagesRef.current;
      if (!images) return;

      if (i < 21) {
         timerRef.current = setTimeout(() => {
            for (let j = 0; j < images.length; j++) {
               (images[j] as HTMLElement).style.display = 'none';
            }
            (images[i] as HTMLElement).style.display = 'block';
            animation(i + 1);
         }, ANIMATION_SPEED);
      }
      if (i === 21) {
         timerRef.current = setTimeout(() => {
            animation(1);
         }, ANIMATION_SPEED);
      }
   };

   const stopAnimation = () => {
      stopRef.current = 1;
      clearTimeout(timerRef.current);

      const images = imagesRef.current;
      if (!images || images.length === 0) return;

      const lastIndex = Math.min(LAST_FRAME, images.length - 1);
      for (let i = 0; i < images.length; i++) {
         (images[i] as HTMLElement).style.display = 'none';
      }
      (images[lastIndex] as HTMLElement).style.display = 'block';
   };

   const playAnimation = () => {
      if (prefersReducedMotion) return;
      stopRef.current = 0;
      animation(1);
   };

   return (
      <span
         ref={containerRef}
         aria-hidden
         onMouseEnter={playAnimation}
         onMouseLeave={stopAnimation}
         className="inline-block h-fit w-37.5"
      >
         <LogoSvg />
      </span>
   );
}
