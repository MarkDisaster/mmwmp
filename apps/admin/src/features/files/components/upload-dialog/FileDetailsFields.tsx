import { File as FileIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { UpdateFileDtoLanguageEnumKey } from '@/api/generated';
import uploadFileBodyDto from '@/api/generated/schemas/uploadFileBodyDto.json';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileLanguageSelect } from '@/features/files/components/FileLanguageSelect';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { formatFileSize, getNameWithoutExtension, isImageMimeType } from '@/utils/file';

const MAX_DISPLAY_NAME_LENGTH = uploadFileBodyDto.properties.displayName.maxLength;

type FileDetailsFieldsProps = {
   file: File;
   displayName: string;
   onDisplayNameChange: (value: string) => void;
   language: UpdateFileDtoLanguageEnumKey | null;
   onLanguageChange: (value: UpdateFileDtoLanguageEnumKey | null) => void;
};

export const FileDetailsFields = ({
   file,
   displayName,
   onDisplayNameChange,
   language,
   onLanguageChange,
}: FileDetailsFieldsProps) => {
   const { t, i18n } = useTranslation();
   const previewUrl = useObjectUrl(isImageMimeType(file.type) ? file : null);

   return (
      <>
         <div className="flex items-center justify-center rounded-xl border bg-muted/30 p-4">
            {previewUrl ? (
               <img
                  src={previewUrl}
                  alt={file.name}
                  className="max-h-48 rounded-lg object-contain"
               />
            ) : (
               <div className="flex flex-col items-center gap-2">
                  <FileIcon className="h-16 w-16 text-muted-foreground" />
                  <span className="max-w-60 truncate text-sm text-muted-foreground">
                     {file.name}
                  </span>
               </div>
            )}
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-display-name">{t('files.uploadDialog.name')}</Label>
            <Input
               id="file-display-name"
               value={displayName}
               onChange={(e) => onDisplayNameChange(e.target.value)}
               maxLength={MAX_DISPLAY_NAME_LENGTH}
               placeholder={getNameWithoutExtension(file.name)}
            />
         </div>

         <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-language">{t('files.uploadDialog.language')}</Label>
            <FileLanguageSelect id="file-language" value={language} onChange={onLanguageChange} />
         </div>

         <p className="text-sm text-muted-foreground">
            {file.name} • {formatFileSize(file.size, i18n.language)}
         </p>
      </>
   );
};
