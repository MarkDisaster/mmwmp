'use client';

import { cn } from '@mm/utils/cn';
import * as Switch from '@radix-ui/react-switch';
import { m, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import MoonSvg from '@/assets/icons/moon.svg';
import SunSvg from '@/assets/icons/sun.svg';

const THUMB_TRAVEL = 26;
const THUMB_SPRING = { type: 'spring' as const, stiffness: 500, damping: 30 };

export function ThemeToggle() {
   const t = useTranslations('Header');
   const { theme, setTheme } = useTheme();
   const [mounted, setMounted] = useState(false);
   const prefersReducedMotion = useReducedMotion();

   useEffect(() => setMounted(true), []);

   if (!mounted) return <div className="h-6 w-12" aria-hidden />;

   const isDark = theme === 'dark';

   return (
      <Switch.Root
         checked={isDark}
         onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
         aria-label={t('darkMode')}
         className="relative flex h-6 w-12 cursor-pointer items-center justify-between rounded-full border border-fixed-white bg-transparent px-1.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fixed-white focus-visible:outline-solid"
      >
         <SunSvg
            aria-hidden
            className={cn(
               'h-3.5 w-3.5 text-fixed-white transition-opacity',
               isDark ? 'opacity-40' : 'opacity-0',
            )}
         />
         <MoonSvg
            aria-hidden
            className={cn(
               'h-3.5 w-3.5 text-fixed-white transition-opacity',
               isDark ? 'opacity-0' : 'opacity-40',
            )}
         />
         <Switch.Thumb asChild>
            <m.span
               initial={false}
               animate={{ x: isDark ? THUMB_TRAVEL : 0, y: '-50%' }}
               transition={prefersReducedMotion ? { duration: 0 } : THUMB_SPRING}
               className="absolute top-1/2 left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fixed-white text-brand"
            >
               {isDark ? (
                  <MoonSvg aria-hidden className="h-2.5 w-2.5" />
               ) : (
                  <SunSvg aria-hidden className="h-2.5 w-2.5" />
               )}
            </m.span>
         </Switch.Thumb>
      </Switch.Root>
   );
}
