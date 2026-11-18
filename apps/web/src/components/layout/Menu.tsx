'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { m, useIsPresent, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import GithubSvg from '@/assets/icons/github.svg';
import LinkedInSvg from '@/assets/icons/linkedin.svg';
import { Link } from '@/i18n/navigation';
import { SOCIAL_PROFILE_URLS } from '@/utils/socialProfiles';

type MenuProps = {
   menuButtonCenter: { x: number; y: number };
   header: ReactNode;
};

const REVEAL_TRANSITION = { duration: 0.5, ease: [0.32, 0.72, 0, 1] as const };
const NO_TRANSITION = { duration: 0 };

type MenuLinkProps = {
   href: string;
   children: ReactNode;
};

function MenuLink({ href, children }: MenuLinkProps) {
   return (
      <Dialog.Close asChild>
         <Link
            href={href}
            className="text-fixed-white no-underline hover:text-fixed-black hover:no-underline focus-visible:text-fixed-black"
         >
            / {children}
         </Link>
      </Dialog.Close>
   );
}

export function Menu({ menuButtonCenter, header }: MenuProps) {
   const t = useTranslations('Header');
   const isPresent = useIsPresent();
   const prefersReducedMotion = useReducedMotion();
   const centerPosition = `${menuButtonCenter.x}px ${menuButtonCenter.y}px`;

   return (
      <Dialog.Portal forceMount>
         <Dialog.Content aria-describedby={undefined}>
            {isPresent && header}

            <Dialog.Overlay asChild>
               <m.div
                  initial={{ clipPath: `circle(0px at ${centerPosition})` }}
                  animate={{ clipPath: `circle(110vmax at ${centerPosition})` }}
                  exit={{ clipPath: `circle(0px at ${centerPosition})` }}
                  transition={prefersReducedMotion ? NO_TRANSITION : REVEAL_TRANSITION}
                  className="fixed inset-0 z-50 flex flex-col items-center bg-brand text-fixed-white"
               >
                  <Dialog.Title className="sr-only">{t('menuTitle')}</Dialog.Title>

                  <nav className="flex max-w-150 flex-1 flex-col items-start justify-center gap-6.25 font-heading text-lg font-semibold uppercase md:text-title">
                     <MenuLink href="/projects">{t('projects')}</MenuLink>
                     <MenuLink href="/about">{t('about')}</MenuLink>
                     <MenuLink href="/contact">{t('contact')}</MenuLink>
                  </nav>

                  <div className="relative flex w-full flex-col items-center px-6.25 pb-12.5">
                     <div className="flex justify-center gap-3.75">
                        <a
                           href={SOCIAL_PROFILE_URLS.github}
                           target="_blank"
                           rel="noopener noreferrer"
                           aria-label={t('github')}
                           className="block size-10 p-0 text-fixed-white"
                        >
                           <GithubSvg aria-hidden className="mx-auto mt-[7.5px] h-auto w-6.25" />
                        </a>
                        <a
                           href={SOCIAL_PROFILE_URLS.linkedin}
                           target="_blank"
                           rel="noopener noreferrer"
                           aria-label={t('linkedin')}
                           className="block size-10 p-0 text-fixed-white"
                        >
                           <LinkedInSvg aria-hidden className="mx-auto mt-[7.5px] h-auto w-6.25" />
                        </a>
                     </div>

                     <Dialog.Close asChild>
                        <Link
                           href="/privacy"
                           className="absolute bottom-4 left-1/2 -translate-x-1/2 py-1 text-xs text-fixed-white/50 no-underline hover:text-fixed-white hover:no-underline focus-visible:text-fixed-white md:right-6.25 md:bottom-6.25 md:left-auto md:translate-x-0 md:py-0"
                        >
                           {t('privacy')}
                        </Link>
                     </Dialog.Close>
                  </div>
               </m.div>
            </Dialog.Overlay>
         </Dialog.Content>
      </Dialog.Portal>
   );
}
