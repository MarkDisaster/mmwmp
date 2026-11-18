import { useTranslations } from 'next-intl';

import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Button } from '@/components/common/Button';
import { HeroFrame } from '@/features/home/components/HeroFrame';
import { Link } from '@/i18n/navigation';

export default function NotFound() {
   const t = useTranslations('NotFound');

   return (
      <HeroFrame
         top1={t('code')}
         top2={t('label')}
         bottom1={t('subtitle')}
         cta={
            <Button asChild className="gap-3">
               <Link href="/">
                  {t('cta')}
                  <ArrowRightSvg className="w-5" />
               </Link>
            </Button>
         }
      />
   );
}
