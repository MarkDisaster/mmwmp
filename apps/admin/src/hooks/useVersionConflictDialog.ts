import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { getHttpStatus } from '@/utils/httpError';

export const useVersionConflictDialog = (loadCurrent: () => Promise<unknown>) => {
   const { t } = useTranslation();
   const [open, setOpen] = useState(false);
   const [isReloading, setIsReloading] = useState(false);

   const reload = async () => {
      setIsReloading(true);
      try {
         await loadCurrent();
         setOpen(false);
      } catch (error) {
         if (getHttpStatus(error) === 404) {
            setOpen(false);
            toast.error(t('common.versionConflict.deleted'));
         } else {
            toast.error(t('common.versionConflict.reloadFailed'));
         }
      } finally {
         setIsReloading(false);
      }
   };

   return {
      show: () => setOpen(true),
      reload,
      dialogProps: { open, onOpenChange: setOpen, onReload: reload, isReloading },
   };
};
