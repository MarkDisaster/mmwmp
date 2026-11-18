'use client';

import { m } from 'motion/react';

type MenuIconProps = {
   isOpen: boolean;
   className?: string;
};

const TRANSITION = { duration: 0.3, ease: 'easeInOut' as const };
const TOP_CLOSED = { d: 'M3 6 L33 6' };
const MIDDLE_CLOSED = { opacity: 1, d: 'M3 12 L33 12' };
const BOTTOM_CLOSED = { d: 'M3 18 L33 18' };

export function MenuIcon({ isOpen, className }: MenuIconProps) {
   return (
      <m.svg
         viewBox="0 0 36 24"
         className={className}
         fill="none"
         stroke="currentColor"
         strokeWidth={2}
         strokeLinecap="round"
      >
         <m.path
            initial={TOP_CLOSED}
            animate={isOpen ? { d: 'M6 5 L30 19' } : TOP_CLOSED}
            transition={TRANSITION}
         />
         <m.path
            initial={MIDDLE_CLOSED}
            animate={isOpen ? { ...MIDDLE_CLOSED, opacity: 0 } : MIDDLE_CLOSED}
            transition={TRANSITION}
         />
         <m.path
            initial={BOTTOM_CLOSED}
            animate={isOpen ? { d: 'M6 19 L30 5' } : BOTTOM_CLOSED}
            transition={TRANSITION}
         />
      </m.svg>
   );
}
