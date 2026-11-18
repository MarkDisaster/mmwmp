import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { FileEntity } from '@/api/generated';
import { EditLockBanner } from '@/components/common/EditLockBanner';
import { InfoHint } from '@/components/common/InfoHint';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { VersionConflictDialog } from '@/components/common/VersionConflictDialog';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { FilePreview } from '@/features/files/components/file-detail/FilePreview';
import { FileLanguageSelect } from '@/features/files/components/FileLanguageSelect';
import { useCopyFileUrl } from '@/features/files/hooks/useCopyFileUrl';
import {
   type FileEditFormValues,
   fileEditSchema,
   MAX_ALT_TEXT_LENGTH,
} from '@/features/files/validation/fileEditSchema';
import { FormInput } from '@/features/form/components/FormInput';
import { useVersionConflictDialog } from '@/hooks/useVersionConflictDialog';
import {
   formatFileSize,
   getFileDisplayName,
   getFileTypeLabel,
   isImageMimeType,
} from '@/utils/file';
import { isVersionConflict } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';

type FileDetailDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   file: FileEntity | null;
   initialMode?: Mode;
   canEdit?: boolean;
   onDelete?: (file: FileEntity) => void;
   onSaved?: (file: FileEntity) => void;
};

type Mode = 'view' | 'edit';

const FIELD_CLASS_NAME = 'flex flex-col gap-1.5 space-y-0';

type FileEditFormProps = {
   file: FileEntity;
   onCancel: () => void;
   onSaved: (file: FileEntity) => void;
};

const FileEditForm = ({ file, onCancel, onSaved }: FileEditFormProps) => {
   const { t, i18n } = useTranslation();
   const updateFile = useMutation(api.files.mutations.update);
   const isImage = isImageMimeType(file.mimeType);
   const [version, setVersion] = useState(file.version);

   const methods = useForm({
      resolver: zodResolver(fileEditSchema),
      values: {
         displayName: getFileDisplayName(file),
         altText: isImage ? (file.altText ?? '') : '',
         language: file.language ?? null,
      },
      resetOptions: { keepDirtyValues: true },
   });
   const conflict = useVersionConflictDialog(async () => {
      const current = await queryClient.fetchQuery({
         ...api.files.queries.detail(file.id),
         staleTime: 0,
      });
      methods.reset({
         displayName: getFileDisplayName(current),
         altText: isImage ? (current.altText ?? '') : '',
         language: current.language ?? null,
      });
      setVersion(current.version);
   });

   const onSubmit = ({ displayName, altText, language }: FileEditFormValues) => {
      updateFile.mutate(
         {
            id: file.id,
            data: {
               version,
               displayName: displayName || null,
               language,
               ...(isImage && { altText: altText || null }),
            },
         },
         {
            onSuccess: (updated) => {
               toast.success(t('files.toast.updated'));
               onSaved(updated);
            },
            onError: (error) => {
               if (isVersionConflict(error)) conflict.show();
            },
         },
      );
   };

   return (
      <FormProvider {...methods}>
         <form onSubmit={methods.handleSubmit(onSubmit)} className="contents">
            <EditLockBanner entity="files" id={file.id} />
            <div className="grid gap-6 sm:grid-cols-[14rem_minmax(0,1fr)]">
               <div className="flex min-w-0 flex-col gap-2">
                  <p className="text-sm font-medium">
                     {isImage
                        ? t('files.editDialog.currentImage')
                        : t('files.editDialog.currentFile')}
                  </p>
                  <FilePreview file={file} compact />
               </div>
               <div className="flex min-w-0 flex-col gap-4">
                  <FormInput
                     name="displayName"
                     label={t('files.editDialog.name')}
                     formItemClassName={FIELD_CLASS_NAME}
                     disabled={updateFile.isPending}
                  />
                  <FormField
                     control={methods.control}
                     name="language"
                     render={({ field }) => (
                        <FormItem className={FIELD_CLASS_NAME}>
                           <FormLabel>{t('files.editDialog.language')}</FormLabel>
                           <FormControl>
                              <FileLanguageSelect
                                 value={field.value}
                                 onChange={field.onChange}
                                 disabled={updateFile.isPending}
                              />
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />
                  {isImage && (
                     <FormField
                        control={methods.control}
                        name="altText"
                        render={({ field }) => (
                           <FormItem className={FIELD_CLASS_NAME}>
                              <div className="flex items-center gap-1">
                                 <FormLabel>{t('files.editDialog.altText')}</FormLabel>
                                 <InfoHint label={t('files.editDialog.altTextHintLabel')}>
                                    <p>{t('files.editDialog.altTextHint')}</p>
                                 </InfoHint>
                              </div>
                              <FormControl>
                                 <Textarea
                                    {...field}
                                    maxLength={MAX_ALT_TEXT_LENGTH}
                                    rows={2}
                                    disabled={updateFile.isPending}
                                 />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        )}
                     />
                  )}
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                     <span>
                        {[getFileTypeLabel(file), formatFileSize(file.size, i18n.language)]
                           .filter(Boolean)
                           .join(' · ')}
                     </span>
                     {file.width && file.height && (
                        <span>
                           {file.width} × {file.height} px
                        </span>
                     )}
                  </div>
               </div>
            </div>

            <DialogFooter>
               <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={updateFile.isPending}
               >
                  {t('common.cancel')}
               </Button>
               <Button type="submit" disabled={updateFile.isPending}>
                  {updateFile.isPending ? t('common.loading') : t('files.editDialog.save')}
               </Button>
            </DialogFooter>
         </form>
         <VersionConflictDialog {...conflict.dialogProps} />
      </FormProvider>
   );
};

type FileDetailContentProps = {
   file: FileEntity;
   initialMode: Mode;
   canEdit: boolean;
   onClose: () => void;
   onDelete?: (file: FileEntity) => void;
   onSaved?: (file: FileEntity) => void;
};

const FileDetailContent = ({
   file,
   initialMode,
   canEdit,
   onClose,
   onDelete,
   onSaved,
}: FileDetailContentProps) => {
   const { t, i18n } = useTranslation();
   const copyFileUrl = useCopyFileUrl();
   const [mode, setMode] = useState<Mode>(canEdit ? initialMode : 'view');

   const handleDelete = () => {
      if (!onDelete) return;
      onDelete(file);
      onClose();
   };

   const handleSaved = (updated: FileEntity) => {
      onSaved?.(updated);
      setMode('view');
   };

   const meta = [
      getFileTypeLabel(file),
      formatFileSize(file.size, i18n.language),
      file.width && file.height ? `${file.width} × ${file.height} px` : null,
   ]
      .filter(Boolean)
      .join(' · ');

   return (
      <>
         <DialogHeader>
            <DialogTitle>
               {mode === 'edit' ? t('files.editDialog.title') : t('files.preview.title')}
            </DialogTitle>
         </DialogHeader>

         {mode === 'view' ? (
            <div className="flex flex-col gap-4">
               <FilePreview file={file} onCopyUrl={() => copyFileUrl(file.publicUrl)} />
               <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                     <p className="font-medium wrap-break-word">{getFileDisplayName(file)}</p>
                     {file.language && <LanguageBadge language={file.language} />}
                  </div>
                  <p className="text-sm text-muted-foreground">{meta}</p>
                  {file.altText && isImageMimeType(file.mimeType) && (
                     <p className="text-sm wrap-break-word">{file.altText}</p>
                  )}
               </div>
               <div className="flex justify-end gap-2">
                  {canEdit && (
                     <Button variant="outline" onClick={() => setMode('edit')}>
                        <Pencil className="mr-1.5 h-4 w-4" />
                        {t('files.preview.edit')}
                     </Button>
                  )}
                  {onDelete && (
                     <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        {t('files.delete.title')}
                     </Button>
                  )}
               </div>
            </div>
         ) : (
            <FileEditForm
               file={file}
               onCancel={() => (initialMode === 'edit' ? onClose() : setMode('view'))}
               onSaved={handleSaved}
            />
         )}
      </>
   );
};

export const FileDetailDialog = ({
   open,
   onOpenChange,
   file,
   initialMode = 'view',
   canEdit = true,
   onDelete,
   onSaved,
}: FileDetailDialogProps) => {
   if (!file) return null;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <FileDetailContent
               key={file.id}
               file={file}
               initialMode={initialMode}
               canEdit={canEdit}
               onClose={() => onOpenChange(false)}
               onDelete={onDelete}
               onSaved={onSaved}
            />
         </DialogContent>
      </Dialog>
   );
};
