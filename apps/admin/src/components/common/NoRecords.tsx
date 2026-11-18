import { cn } from '@mm/utils/cn';
import { Link, type LinkProps } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

type NoRecordsAction = { label: string } & ({ to: LinkProps['to'] } | { onClick: () => void });

type NoRecordsProps = {
   action?: NoRecordsAction;
   className?: string;
};

export const NoRecords = ({ action, className }: NoRecordsProps) => {
   const { t } = useTranslation();

   const content = (
      <>
         <Plus className="mr-2 h-4 w-4" />
         {action?.label}
      </>
   );

   return (
      <div className={cn('flex flex-col items-center gap-3 text-center', className)}>
         <p className="text-sm text-muted-foreground">{t('common.noRecords')}</p>
         {action &&
            ('to' in action ? (
               <Button variant="outline" size="sm" asChild>
                  <Link to={action.to}>{content}</Link>
               </Button>
            ) : (
               <Button variant="outline" size="sm" onClick={action.onClick}>
                  {content}
               </Button>
            ))}
      </div>
   );
};
