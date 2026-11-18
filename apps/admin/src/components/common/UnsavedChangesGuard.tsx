import { type ShouldBlockFn, useBlocker } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';

type UnsavedChangesGuardProps = {
   when: boolean;
};

const isOtherPage: ShouldBlockFn = ({ current, next }) => current.pathname !== next.pathname;

export const UnsavedChangesGuard = ({ when }: UnsavedChangesGuardProps) => {
   const { t } = useTranslation();
   const { status, proceed, reset } = useBlocker({
      shouldBlockFn: isOtherPage,
      disabled: !when,
      withResolver: true,
   });

   return (
      <ConfirmDialog
         open={status === 'blocked'}
         onOpenChange={(open) => !open && reset?.()}
         onConfirm={() => proceed?.()}
         title={t('common.unsavedChanges.title')}
         description={t('common.unsavedChanges.description')}
         destructive
         confirmLabel={t('common.unsavedChanges.confirm')}
         cancelLabel={t('common.unsavedChanges.cancel')}
      />
   );
};
