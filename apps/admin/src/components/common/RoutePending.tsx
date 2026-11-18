import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const RoutePending = () => {
   const { t } = useTranslation();

   return (
      <div role="status" className="flex justify-center px-4 py-16">
         <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
         <span className="sr-only">{t('common.loading')}</span>
      </div>
   );
};
