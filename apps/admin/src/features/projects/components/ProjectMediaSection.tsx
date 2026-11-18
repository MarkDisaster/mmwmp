import { closestCenter, DndContext, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@mm/utils/cn';
import { Download, FileIcon, GripVertical, Pencil, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { GroupLabel } from '@/components/common/GroupLabel';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileDetailDialog } from '@/features/files/components/FileDetailDialog';
import { FileTypesHelp } from '@/features/files/components/FileTypesHelp';
import { FileUploadField } from '@/features/files/components/FileUploadField';
import { withFileLanguage } from '@/features/projects/utils/projectFormValues';
import type {
   MediaFormValues,
   ProjectFormValues,
} from '@/features/projects/validation/projectSchema';
import { useSortableSensors } from '@/hooks/useSortableSensors';
import {
   formatFileSize,
   getFileDisplayName,
   getFileTypeLabel,
   getThumbnailUrl,
} from '@/utils/file';

type ProjectMediaSectionProps = {
   savedFiles: ReadonlyMap<number, FileEntity>;
};

export const ProjectMediaSection = ({ savedFiles }: ProjectMediaSectionProps) => {
   const { t } = useTranslation();
   const labelId = useId();
   const selectButtonRef = useRef<HTMLButtonElement | null>(null);
   const [editedFile, setEditedFile] = useState<FileEntity | null>(null);
   const [changedFiles, setChangedFiles] = useState<ReadonlyMap<number, FileEntity>>(new Map());
   const { control, formState, getValues } = useFormContext<ProjectFormValues>();
   const { fields, append, remove, move, update } = useFieldArray({ control, name: 'media' });

   const sensors = useSortableSensors();

   const getFile = (fileId: number) => changedFiles.get(fileId) ?? savedFiles.get(fileId);
   const storeFile = (file: FileEntity) =>
      setChangedFiles((files) => new Map(files).set(file.id, file));

   const handleAdd = (file: FileEntity) => {
      storeFile(file);
      append({ fileId: file.id, language: file.language ?? null });
   };

   const handleRemove = (index: number) => {
      remove(index);
      requestAnimationFrame(() => selectButtonRef.current?.focus());
   };

   const handleDragEnd = ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      const from = fields.findIndex((field) => field.id === active.id);
      const to = fields.findIndex((field) => field.id === over.id);
      if (from < 0 || to < 0) return;
      move(from, to);
   };

   const handleFileUpdated = (file: FileEntity) => {
      const previous = getFile(file.id);
      storeFile(file);
      if (!previous) return;
      const media = getValues('media');
      const changed = withFileLanguage(media, formState.defaultValues?.media ?? [], {
         fileId: file.id,
         from: previous.language,
         to: file.language,
      });
      changed.forEach((item, index) => {
         if (item !== media[index]) update(index, item);
      });
   };

   return (
      <div role="group" aria-labelledby={labelId} className="space-y-2">
         <div className="flex items-center gap-1">
            <GroupLabel id={labelId}>{t('projects.form.media')}</GroupLabel>
            <FileTypesHelp />
         </div>

         <FileUploadField
            hint={t('projects.form.mediaHint')}
            selectButtonRef={selectButtonRef}
            onUploaded={handleAdd}
            onSelectExisting={handleAdd}
         />

         {fields.length > 0 && (
            <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               onDragEnd={handleDragEnd}
            >
               <SortableContext
                  items={fields.map((field) => field.id)}
                  strategy={verticalListSortingStrategy}
               >
                  <ul className="space-y-2">
                     {fields.map((field, index) => {
                        const file = getFile(field.fileId);
                        return (
                           <SortableMediaRow
                              key={field.id}
                              id={field.id}
                              file={file}
                              language={field.language}
                              onEdit={() => file && setEditedFile(file)}
                              onRemove={() => handleRemove(index)}
                           />
                        );
                     })}
                  </ul>
               </SortableContext>
            </DndContext>
         )}

         <FileDetailDialog
            open={editedFile !== null}
            onOpenChange={(open) => !open && setEditedFile(null)}
            file={editedFile}
            initialMode="edit"
            onSaved={handleFileUpdated}
         />
      </div>
   );
};

type SortableMediaRowProps = {
   id: string;
   file: FileEntity | undefined;
   language: MediaFormValues['language'];
   onEdit: () => void;
   onRemove: () => void;
};

const iconButtonClass = 'size-11 sm:size-8';

const SortableMediaRow = ({ id, file, language, onEdit, onRemove }: SortableMediaRowProps) => {
   const { t, i18n } = useTranslation();
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id,
   });
   const thumbUrl = file ? getThumbnailUrl(file) : null;
   const name = file ? getFileDisplayName(file) : '';

   return (
      <li
         ref={setNodeRef}
         style={{ transform: CSS.Transform.toString(transform), transition }}
         className={cn(
            'flex flex-wrap items-center gap-2 border-b p-2 transition-colors hover:bg-muted/50 sm:flex-nowrap',
            isDragging && 'relative z-10 bg-background opacity-80 shadow-md',
         )}
      >
         <button
            type="button"
            {...attributes}
            {...listeners}
            className={cn(
               'flex shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground active:cursor-grabbing',
               iconButtonClass,
            )}
            aria-label={`${t('projects.form.mediaMove')} ${name}`}
         >
            <GripVertical className="h-4 w-4" />
         </button>
         {thumbUrl ? (
            <img src={thumbUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
         ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
               <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
         )}
         <div className="min-w-40 flex-1 text-sm">
            <span title={name} className="block truncate font-medium">
               {name}
            </span>
            <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
               <span>
                  {file && getFileTypeLabel(file)} •{' '}
                  {file && formatFileSize(file.size, i18n.language)}
               </span>
               <LanguageBadge language={language ?? t('projects.form.mediaLanguageAll')} />
               {file?.deletedAt && (
                  <Badge variant="destructive" title={t('trash.fileInTrash')}>
                     {t('trash.fileInTrashShort')}
                  </Badge>
               )}
            </div>
         </div>
         <div className="ml-auto flex shrink-0 gap-1">
            {file && (
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button asChild variant="ghost" size="icon-sm" className={iconButtonClass}>
                        <a
                           href={file.publicUrl}
                           download={file.originalName}
                           target="_blank"
                           rel="noreferrer"
                           aria-label={`${t('projects.form.mediaDownload')} ${name}`}
                        >
                           <Download className="h-4 w-4" />
                        </a>
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{`${t('projects.form.mediaDownload')} ${name}`}</TooltipContent>
               </Tooltip>
            )}
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon-sm"
                     className={iconButtonClass}
                     aria-label={`${t('projects.form.mediaEdit')} ${name}`}
                     onClick={onEdit}
                  >
                     <Pencil className="h-4 w-4" />
                  </Button>
               </TooltipTrigger>
               <TooltipContent>{`${t('projects.form.mediaEdit')} ${name}`}</TooltipContent>
            </Tooltip>
            <Tooltip>
               <TooltipTrigger asChild>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon-sm"
                     className={iconButtonClass}
                     aria-label={`${t('projects.form.mediaRemove')} ${name}`}
                     onClick={onRemove}
                  >
                     <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
               </TooltipTrigger>
               <TooltipContent>{`${t('projects.form.mediaRemove')} ${name}`}</TooltipContent>
            </Tooltip>
         </div>
      </li>
   );
};
