import { cn } from '@mm/utils/cn';
import type { ReactNode } from 'react';

import { RunnerGame } from '@/features/runner-game/components/RunnerGame';

const HEADLINE_CLASS =
   'font-heading text-title md:text-display font-bold uppercase leading-none flex';

type HeroFrameProps = {
   top1: string;
   top2?: string;
   bottom1: string;
   bottom2?: string;
   cta: ReactNode;
};

export function HeroFrame({ top1, top2, bottom1, bottom2, cta }: HeroFrameProps) {
   return (
      <section
         data-no-footer
         className="relative z-10 flex h-[calc(100vh-150px)] min-h-fit w-full flex-col justify-center px-6.25 pt-12.5 pb-28 leading-20"
      >
         <h1 className="sr-only">{[top1, top2, bottom1, bottom2].filter(Boolean).join(' ')}</h1>
         <div className="z-20 flex flex-col">
            <div className="flex flex-col leading-none md:flex-row md:items-end">
               <div className="flex flex-col">
                  <div className={HEADLINE_CLASS} aria-hidden>
                     {top1}
                  </div>
                  {top2 && (
                     <div className={cn(HEADLINE_CLASS, 'items-end gap-6 pl-20')} aria-hidden>
                        {top2}
                     </div>
                  )}
               </div>
               <RunnerGame />
            </div>
            <div className="flex flex-col items-end leading-none">
               <div className={HEADLINE_CLASS} aria-hidden>
                  {bottom1}
               </div>
               {bottom2 && (
                  <div className={HEADLINE_CLASS} aria-hidden>
                     {bottom2}
                  </div>
               )}
            </div>
            <div className="mt-20 flex justify-end self-end pr-20">{cta}</div>
         </div>
      </section>
   );
}
