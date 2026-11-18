import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

type QueryErrorStateProps = {
   onRetry: () => void;
   isRetrying?: boolean;
};

export const QueryErrorState = ({ onRetry, isRetrying }: QueryErrorStateProps) => {
   const { t } = useTranslation();

   return (
      <div
         role="alert"
         className="flex flex-col items-center gap-3 rounded-md border px-4 py-10 text-center"
      >
         <p className="text-sm text-destructive">{t('common.loadError')}</p>
         <Button variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? t('common.loading') : t('common.retry')}
         </Button>
      </div>
   );
};
