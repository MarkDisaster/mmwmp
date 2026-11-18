'use client';

import { useLocale, useTranslations } from 'next-intl';

import CloseSvg from '@/assets/icons/close.svg';

export function PreviewBanner() {
   const t = useTranslations('Preview');
   const locale = useLocale();

   return (
      <div className="fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-4 bg-brand py-2 text-center text-sm font-semibold text-brand-foreground">
         <span>
            {t.rich('banner', {
               exit: (chunks) => (
                  <a
                     href={`/api/draft/disable?locale=${locale}`}
                     className="text-brand-foreground underline focus-visible:outline-brand-foreground"
                  >
                     {chunks}
                  </a>
               ),
            })}
         </span>
         <a
            href={`/api/draft/disable?locale=${locale}`}
            className="rounded border border-brand-foreground/50 px-2 py-0.5 text-xs text-brand-foreground hover:bg-brand-foreground/10 focus-visible:outline-brand-foreground"
            aria-label={t('exitDraftMode')}
         >
            <CloseSvg aria-hidden className="h-4 w-2" />
         </a>
      </div>
   );
}
