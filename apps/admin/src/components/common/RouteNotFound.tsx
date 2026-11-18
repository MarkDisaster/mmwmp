import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export const RouteNotFound = () => {
   const { t } = useTranslation();

   return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
         <h1 className="text-2xl font-semibold">{t('common.notFoundTitle')}</h1>
         <p className="text-sm text-muted-foreground">{t('common.notFoundDescription')}</p>
         <Button variant="outline" asChild>
            <Link to="/">{t('common.backHome')}</Link>
         </Button>
      </div>
   );
};
