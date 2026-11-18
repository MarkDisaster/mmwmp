import { useTranslation } from 'react-i18next';

import { formatFileSize } from '@/utils/file';

type UploadProgressProps = { file: File; progress: number };

export const UploadProgress = ({ file, progress }: UploadProgressProps) => {
   const { t, i18n } = useTranslation();

   return (
      <div className="space-y-2">
         <div className="flex items-center gap-3">
            <div
               role="progressbar"
               aria-label={t('files.uploadDialog.uploading')}
               aria-valuemin={0}
               aria-valuemax={100}
               aria-valuenow={progress}
               className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            >
               <div
                  className="h-full bg-primary transition-[width]"
                  style={{ width: `${progress}%` }}
               />
            </div>
            <span className="text-sm font-medium">{progress} %</span>
         </div>
         <p className="text-sm text-muted-foreground">
            {file.name} • {formatFileSize(file.size, i18n.language)}
         </p>
      </div>
   );
};
