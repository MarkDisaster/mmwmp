import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

type VersionConflictDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onReload: () => void;
   isReloading?: boolean;
};

export const VersionConflictDialog = ({
   open,
   onOpenChange,
   onReload,
   isReloading,
}: VersionConflictDialogProps) => {
   const { t } = useTranslation();

   return (
      <ConfirmDialog
         open={open}
         onOpenChange={onOpenChange}
         onConfirm={onReload}
         isPending={isReloading}
         title={t('common.versionConflict.title')}
         description={t('common.versionConflict.description')}
         confirmLabel={t('common.versionConflict.reload')}
         cancelLabel={t('common.versionConflict.close')}
      />
   );
};
