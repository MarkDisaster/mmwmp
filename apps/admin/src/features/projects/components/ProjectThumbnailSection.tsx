import { Pencil, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { GroupLabel } from '@/components/common/GroupLabel';
import { Button } from '@/components/ui/button';
import { FileThumbnail } from '@/features/files/components/FileThumbnail';
import { FileTypesHelp } from '@/features/files/components/FileTypesHelp';
import { FileUploadField } from '@/features/files/components/FileUploadField';
import type { ProjectFormValues } from '@/features/projects/validation/projectSchema';
import {
   formatFileSize,
   getFileDisplayName,
   getFileTypeLabel,
   getThumbnailUrl,
} from '@/utils/file';

export const ProjectThumbnailSection = () => {
   const { t, i18n } = useTranslation();
   const labelId = useId();
   const selectButtonRef = useRef<HTMLButtonElement | null>(null);
   const { control } = useFormContext<ProjectFormValues>();
   const {
      field: { value: thumbnail, onChange },
   } = useController({ control, name: 'thumbnail' });

   const handleSelect = (file: FileEntity) => onChange(file);

   return (
      <div role="group" aria-labelledby={labelId} className="space-y-2">
         <div className="flex items-center gap-1">
            <GroupLabel id={labelId}>{t('projects.form.thumbnail')}</GroupLabel>
            <FileTypesHelp imagesOnly />
         </div>

         <FileUploadField
            imagesOnly
            renderSelected={
               thumbnail && getThumbnailUrl(thumbnail)
                  ? ({ openGallery }) => (
                       <div className="flex flex-wrap gap-4">
                          <FileThumbnail
                             file={thumbnail}
                             className="aspect-4/3 w-32 shrink-0 rounded-lg border"
                          />
                          <div className="min-w-36 flex-1 space-y-3">
                             <div className="min-w-0 space-y-1">
                                <p
                                   title={getFileDisplayName(thumbnail)}
                                   className="truncate text-sm font-semibold"
                                >
                                   {getFileDisplayName(thumbnail)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                   {getFileTypeLabel(thumbnail)} •{' '}
                                   {formatFileSize(thumbnail.size, i18n.language)}
                                </p>
                                {thumbnail.deletedAt && (
                                   <p role="status" className="text-xs text-destructive">
                                      {t('trash.fileInTrash')}
                                   </p>
                                )}
                             </div>
                             <div className="flex flex-wrap gap-2">
                                <Button
                                   type="button"
                                   variant="outline"
                                   size="sm"
                                   className="min-h-11 sm:min-h-0"
                                   onClick={openGallery}
                                >
                                   <Pencil />
                                   {t('projects.form.thumbnailChange')}
                                </Button>
                                <Button
                                   type="button"
                                   variant="secondary"
                                   size="sm"
                                   className="min-h-11 sm:min-h-0"
                                   onClick={() => {
                                      onChange(null);
                                      requestAnimationFrame(() => selectButtonRef.current?.focus());
                                   }}
                                >
                                   <X />
                                   {t('projects.form.thumbnailRemove')}
                                </Button>
                             </div>
                          </div>
                       </div>
                    )
                  : undefined
            }
            selectButtonRef={selectButtonRef}
            onUploaded={handleSelect}
            onSelectExisting={handleSelect}
         />
      </div>
   );
};
