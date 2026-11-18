import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

type NewerVersionNoticeProps = {
   visible: boolean;
   onReload: () => void;
   isReloading?: boolean;
};

export const NewerVersionNotice = ({ visible, onReload, isReloading }: NewerVersionNoticeProps) => {
   const { t } = useTranslation();
   const message = t('common.newerVersion.message');

   return (
      <>
         <div aria-live="polite" className="sr-only">
            {visible ? message : ''}
         </div>
         {visible && (
            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
               <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
               <p className="flex-1 text-sm">{message}</p>
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onReload}
                  disabled={isReloading}
               >
                  {isReloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('common.newerVersion.reload')}
               </Button>
            </div>
         )}
      </>
   );
};
