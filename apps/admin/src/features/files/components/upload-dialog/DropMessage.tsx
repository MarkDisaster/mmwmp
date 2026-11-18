import { cn } from '@mm/utils/cn';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { DropzoneState } from '@/features/files/components/FileDropzone';
import { MAX_FILE_SIZE_MB } from '@/features/files/constants';

const getMessageKey = ({ isDragOver, isInvalid }: DropzoneState) => {
   if (!isDragOver) return 'files.uploadDialog.description';
   return isInvalid ? 'files.field.error.invalidType.title' : 'files.uploadDialog.dropHere';
};

export const DropMessage = (state: DropzoneState) => {
   const { t } = useTranslation();

   return (
      <>
         <Upload className="h-10 w-10 text-muted-foreground" />
         <p
            className={cn(
               'text-sm',
               state.isDragOver && state.isInvalid ? 'text-destructive' : 'text-muted-foreground',
            )}
         >
            {t(getMessageKey(state))}
         </p>
         <p className="text-xs text-muted-foreground/60">
            {t('files.field.maxSize', { size: MAX_FILE_SIZE_MB })}
         </p>
      </>
   );
};
