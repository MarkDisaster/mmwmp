import { type ChangeEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { FileEntity } from '@/api/generated';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDropzone } from '@/features/files/components/FileDropzone';
import { FileNotice } from '@/features/files/components/FileNotice';
import { DropMessage } from '@/features/files/components/upload-dialog/DropMessage';
import { FileDetailsFields } from '@/features/files/components/upload-dialog/FileDetailsFields';
import { UploadActions } from '@/features/files/components/upload-dialog/UploadActions';
import { UploadProgress } from '@/features/files/components/upload-dialog/UploadProgress';
import { useFileUploadFlow } from '@/features/files/hooks/useFileUploadFlow';
import {
   getFileErrorMessage,
   getFileKind,
   matchesAccept,
   toInputAccept,
} from '@/features/files/utils/fileValidation';

type FileUploadDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   initialFile?: File | null;
   onUploaded?: (file: FileEntity) => void;
   accept?: string[];
   onCloseAutoFocus?: (event: Event) => void;
};

export const FileUploadDialog = ({
   open,
   onOpenChange,
   initialFile = null,
   onUploaded,
   accept,
   onCloseAutoFocus,
}: FileUploadDialogProps) => {
   const { t } = useTranslation();
   const inputRef = useRef<HTMLInputElement>(null);

   const flow = useFileUploadFlow({
      initialFile,
      accept,
      onUploaded: (uploaded) => {
         toast.success(t('files.toast.uploaded'));
         onUploaded?.(uploaded);
         onOpenChange(false);
      },
   });

   const handleOpenChange = (isOpen: boolean) => {
      if (isOpen) {
         onOpenChange(true);
         return;
      }
      if (flow.isPending) return;
      flow.reset();
      onOpenChange(false);
   };

   const preventWhilePending = (event: Event) => {
      if (flow.isPending) event.preventDefault();
   };

   const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) flow.pick(file);
      e.target.value = '';
   };

   const handleCancel = () => (flow.isPending ? flow.abort() : flow.reset());

   const errorMessage = flow.fileError
      ? getFileErrorMessage(t, flow.fileError, getFileKind(accept))
      : null;

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogContent
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={preventWhilePending}
            onInteractOutside={preventWhilePending}
            showCloseButton={!flow.isPending}
            className="max-h-[85dvh] overflow-y-auto sm:max-w-[min(42rem,calc(100%-2rem))]"
         >
            <DialogHeader>
               <DialogTitle>
                  {flow.isPending
                     ? t('files.uploadDialog.uploadingTitle')
                     : t('files.uploadDialog.title')}
               </DialogTitle>
            </DialogHeader>

            {!flow.file ? (
               <>
                  <FileDropzone
                     onFile={flow.pick}
                     isTypeAllowed={(mimeType) => matchesAccept(mimeType, accept)}
                     onClick={() => inputRef.current?.click()}
                     className="p-10"
                  >
                     {(state) => <DropMessage {...state} />}
                  </FileDropzone>
                  <input
                     ref={inputRef}
                     type="file"
                     accept={toInputAccept(accept)}
                     onChange={handleInputChange}
                     className="hidden"
                  />
                  <div role="status">
                     {errorMessage && (
                        <FileNotice
                           tone="error"
                           title={errorMessage.title}
                           detail={errorMessage.detail}
                        />
                     )}
                  </div>
               </>
            ) : (
               <div className="flex flex-col gap-4">
                  {flow.isPending ? (
                     <UploadProgress file={flow.file} progress={flow.progress} />
                  ) : (
                     <FileDetailsFields
                        file={flow.file}
                        displayName={flow.displayName}
                        onDisplayNameChange={flow.setDisplayName}
                        language={flow.language}
                        onLanguageChange={flow.setLanguage}
                     />
                  )}
                  <div role="status">
                     {flow.uploadFailed && (
                        <FileNotice
                           tone="error"
                           title={t('files.uploadDialog.failed')}
                           detail={t('files.uploadDialog.failedDetail')}
                        />
                     )}
                  </div>

                  <UploadActions
                     isPending={flow.isPending}
                     hasFailed={flow.uploadFailed}
                     onCancel={handleCancel}
                     onUpload={flow.upload}
                  />
               </div>
            )}
         </DialogContent>
      </Dialog>
   );
};
