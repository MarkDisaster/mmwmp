import { useQuery } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { type ChangeEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { FileEntity } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDropzone } from '@/features/files/components/FileDropzone';
import { FileThumbnail } from '@/features/files/components/FileThumbnail';
import { useUploadFile } from '@/features/files/hooks/useUploadFile';
import {
   getFileError,
   getFileErrorMessage,
   getFileKind,
   matchesAccept,
   toInputAccept,
} from '@/features/files/utils/fileValidation';
import { getFileDisplayName } from '@/utils/file';

type FilePickerDialogProps = {
   open: boolean;
   onSelect: (file: FileEntity) => void;
   onClose: () => void;
   accept?: string[];
   onCloseAutoFocus?: (event: Event) => void;
};

export const FilePickerDialog = ({
   open,
   onSelect,
   onClose,
   accept,
   onCloseAutoFocus,
}: FilePickerDialogProps) => {
   const { t } = useTranslation();
   const { data: filesData, isPending } = useQuery({
      ...api.files.queries.all(accept?.length === 1 ? { mimeTypePrefix: accept[0] } : undefined),
      enabled: open,
   });
   const uploadFile = useUploadFile({ errorMessage: 'files.toast.error' });
   const inputRef = useRef<HTMLInputElement>(null);

   const files = (filesData?.data ?? []).filter((file) => matchesAccept(file.mimeType, accept));

   const openFilePicker = () => inputRef.current?.click();

   const handleUpload = (file: File) => {
      const error = getFileError(file, accept);
      if (error) {
         const { title, detail } = getFileErrorMessage(t, error, getFileKind(accept));
         toast.error(title, { description: detail });
         return;
      }
      uploadFile.mutate({ file }, { onSuccess: (uploaded) => onSelect(uploaded) });
   };

   const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
   };

   const renderContent = () => {
      if (isPending) {
         return (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">
               {t('common.loading')}
            </p>
         );
      }

      if (!files.length) {
         return (
            <FileDropzone
               onFile={handleUpload}
               isTypeAllowed={(mimeType) => matchesAccept(mimeType, accept)}
               onClick={openFilePicker}
               className="min-h-[200px] p-6"
            >
               <p className="text-sm text-muted-foreground">{t('filePicker.noFiles')}</p>
            </FileDropzone>
         );
      }

      return (
         <div className="-m-1 grid min-h-0 flex-1 grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] content-start gap-2 overflow-y-auto p-1">
            {files.map((file) => (
               <button
                  key={file.id}
                  type="button"
                  onClick={() => onSelect(file)}
                  className="flex min-h-11 min-w-0 cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all hover:ring-2 hover:ring-primary"
               >
                  <div className="flex h-24 items-center justify-center bg-muted">
                     <FileThumbnail file={file} className="h-full w-full" iconClassName="h-8 w-8" />
                  </div>
                  <p title={getFileDisplayName(file)} className="truncate px-1.5 py-1 text-xs">
                     {getFileDisplayName(file)}
                  </p>
               </button>
            ))}
         </div>
      );
   };

   return (
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
         <DialogContent
            onCloseAutoFocus={onCloseAutoFocus}
            className="flex max-h-[85dvh] flex-col gap-4 overflow-hidden sm:max-w-[min(48rem,calc(100%-2rem))] lg:max-w-[min(56rem,calc(100%-2rem))]"
         >
            <DialogHeader className="pr-8">
               <DialogTitle>{t('filePicker.title')}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2">
               <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 sm:min-h-0"
                  size="sm"
                  onClick={openFilePicker}
                  disabled={uploadFile.isPending}
               >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadFile.isPending ? t('filePicker.uploading') : t('filePicker.upload')}
               </Button>
               <input
                  ref={inputRef}
                  type="file"
                  onChange={handleInputChange}
                  accept={toInputAccept(accept)}
                  className="hidden"
               />
            </div>

            {renderContent()}
         </DialogContent>
      </Dialog>
   );
};
