'use client';

import { LazyMotion, MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

const loadMotionFeatures = () => import('@/utils/motionFeatures').then((mod) => mod.domAnimation);

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
   return (
      <ThemeProvider
         attribute="class"
         defaultTheme="dark"
         enableSystem={false}
         disableTransitionOnChange
      >
         <MotionConfig reducedMotion="user">
            <LazyMotion features={loadMotionFeatures} strict>
               {children}
            </LazyMotion>
         </MotionConfig>
      </ThemeProvider>
   );
}
