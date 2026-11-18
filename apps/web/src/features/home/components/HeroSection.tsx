'use client';

import { cn } from '@mm/utils/cn';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Button } from '@/components/common/Button';
import { RunnerGame } from '@/features/runner-game/components/RunnerGame';
import { Link } from '@/i18n/navigation';

const HEADLINE_CLASS =
   'font-heading text-title md:text-display font-bold uppercase leading-none flex';

let heroIntroPlayed = false;

export function HeroSection() {
   const t = useTranslations('HomePage');
   const [introPlayed] = useState(() => heroIntroPlayed);
   const sectionRef = useRef<HTMLElement>(null);

   useEffect(() => {
      heroIntroPlayed = true;
   }, []);

   return (
      <section
         ref={sectionRef}
         className="relative z-10 flex h-[calc(100vh-150px)] min-h-fit w-full touch-manipulation flex-col justify-center px-6.25 pt-12.5 pb-28 leading-20"
      >
         <h1 className="sr-only">{`${t('name')} ${t('name')} – ${t('role1')} ${t('role2')}`}</h1>
         <div className="z-20 flex flex-col">
            <div className="flex flex-col leading-none md:flex-row md:items-end">
               <div className="flex flex-col">
                  <div className={HEADLINE_CLASS} aria-hidden>
                     {t('name')}
                  </div>
                  <div className={cn(HEADLINE_CLASS, 'items-end gap-6 pl-20')} aria-hidden>
                     {t('name')}
                  </div>
               </div>
               <RunnerGame skipIntro={introPlayed} touchAreaRef={sectionRef} />
            </div>
            <div className="flex flex-col items-end leading-none">
               <div className={HEADLINE_CLASS} aria-hidden>
                  {t('role1')}
               </div>
               <div className={HEADLINE_CLASS} aria-hidden>
                  {t('role2')}
               </div>
            </div>
            <div className="mt-20 flex justify-end self-end pr-20">
               <Button asChild className="gap-3">
                  <Link href="/contact">
                     {t('cta')}
                     <ArrowRightSvg className="w-5" />
                  </Link>
               </Button>
            </div>
         </div>
      </section>
   );
}
