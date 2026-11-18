import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

type UploadActionsProps = {
   isPending: boolean;
   hasFailed: boolean;
   onCancel: () => void;
   onUpload: () => void;
};

const UploadButtonLabel = ({
   isPending,
   hasFailed,
}: Pick<UploadActionsProps, 'isPending' | 'hasFailed'>) => {
   const { t } = useTranslation();

   if (isPending) return t('files.uploadDialog.uploading');
   if (!hasFailed) return t('files.upload');
   return (
      <>
         <RefreshCw />
         {t('files.uploadDialog.retry')}
      </>
   );
};

export const UploadActions = ({ isPending, hasFailed, onCancel, onUpload }: UploadActionsProps) => {
   const { t } = useTranslation();

   return (
      <div className="flex justify-end gap-2">
         <Button variant="outline" onClick={onCancel}>
            {t('files.uploadDialog.cancel')}
         </Button>
         <Button onClick={onUpload} disabled={isPending}>
            <UploadButtonLabel isPending={isPending} hasFailed={hasFailed} />
         </Button>
      </div>
   );
};
