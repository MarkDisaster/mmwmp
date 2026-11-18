import { cn } from '@mm/utils/cn';
import { useTranslation } from 'react-i18next';

type NoResultsProps = {
   className?: string;
};

export const NoResults = ({ className }: NoResultsProps) => {
   const { t } = useTranslation();

   return (
      <div className={cn('flex flex-col items-center gap-1 text-center', className)}>
         <p className="text-sm font-medium">{t('common.noResults')}</p>
         <p className="text-sm text-muted-foreground">{t('common.noResultsHint')}</p>
      </div>
   );
};
