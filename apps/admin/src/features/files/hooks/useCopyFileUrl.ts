import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export const useCopyFileUrl = () => {
   const { t } = useTranslation();

   return useCallback(
      (url: string) => {
         const copy = async () => {
            try {
               await navigator.clipboard.writeText(url);
               toast.success(t('files.toast.copied'));
            } catch {
               toast.error(t('common.error'));
            }
         };
         void copy();
      },
      [t],
   );
};
