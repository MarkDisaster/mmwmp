'use client';

import { useTranslations } from 'next-intl';

import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Button } from '@/components/common/Button';
import { HeroFrame } from '@/features/home/components/HeroFrame';

type ErrorPageProps = {
   error: Error & { digest?: string };
   reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
   const t = useTranslations('ErrorPage');

   return (
      <HeroFrame
         top1={t('code')}
         top2={t('label')}
         bottom1={t('subtitle')}
         cta={
            <Button onClick={reset} className="gap-3">
               {t('cta')}
               <ArrowRightSvg className="w-5" />
            </Button>
         }
      />
   );
}
