import { cn } from '@mm/utils/cn';
import { AlertTriangle, CloudUpload, ImageIcon, Info, Upload } from 'lucide-react';
import { type ChangeEvent, type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { FileDropzone } from '@/features/files/components/FileDropzone';
import { FileNotice } from '@/features/files/components/FileNotice';
import { FilePickerDialog } from '@/features/files/components/FilePickerDialog';
import { FileUploadDialog } from '@/features/files/components/FileUploadDialog';
import {
   type FileError,
   getFileError,
   getFileErrorMessage,
   matchesAccept,
   toInputAccept,
} from '@/features/files/utils/fileValidation';
import { useIsTouchOnly } from '@/hooks/useIsTouchOnly';
import { formatFileSize, getFileDisplayName } from '@/utils/file';

type FileUploadFieldProps = {
   imagesOnly?: boolean;
   hint?: string;
   disabled?: boolean;
   onUploaded: (file: FileEntity) => void;
   onSelectExisting: (file: FileEntity) => void;
   selectButtonRef?: Ref<HTMLButtonElement>;
   renderSelected?: (actions: { openGallery: () => void }) => ReactNode;
   className?: string;
};

const IMAGE_ACCEPT = ['image/'];

const ADDED_NOTICE_MS = 5000;

type DragMessageProps = { isInvalid: boolean; imagesOnly?: boolean };

const DragMessage = ({ isInvalid, imagesOnly }: DragMessageProps) => {
   const { t } = useTranslation();
   const kind = imagesOnly ? 'image' : 'file';

   const { Icon, iconClass, title, hint } = isInvalid
      ? {
           Icon: AlertTriangle,
           iconClass: 'text-destructive',
           title: t(`files.field.error.${imagesOnly ? 'notImage' : 'invalidType'}.title`),
           hint: t(`files.field.types.${kind}`),
        }
      : {
           Icon: CloudUpload,
           iconClass: 'text-primary',
           title: t('files.uploadDialog.dropHere'),
           hint: t(`files.field.dropHint.${kind}`),
        };

   return (
      <>
         <Icon className={cn('h-7 w-7', iconClass)} />
         <p className="text-center text-sm font-semibold">{title}</p>
         <p className="text-center text-xs text-muted-foreground">{hint}</p>
      </>
   );
};

export const FileUploadField = ({
   imagesOnly,
   hint,
   disabled,
   onUploaded,
   onSelectExisting,
   selectButtonRef,
   renderSelected,
   className,
}: FileUploadFieldProps) => {
   const { t, i18n } = useTranslation();
   const isTouchOnly = useIsTouchOnly();
   const inputRef = useRef<HTMLInputElement>(null);
   const buttonRef = useRef<HTMLButtonElement | null>(null);
   const selectedRef = useRef<HTMLDivElement>(null);
   const [galleryOpen, setGalleryOpen] = useState(false);
   const [pendingFile, setPendingFile] = useState<File | null>(null);
   const [error, setError] = useState<FileError | null>(null);
   const [added, setAdded] = useState<FileEntity | null>(null);

   const accept = imagesOnly ? IMAGE_ACCEPT : undefined;
   const kind = imagesOnly ? 'image' : 'file';

   const setButtonRef = (node: HTMLButtonElement | null) => {
      buttonRef.current = node;
      if (typeof selectButtonRef === 'function') selectButtonRef(node);
      else if (selectButtonRef) selectButtonRef.current = node;
   };

   useEffect(() => {
      if (!added) return;
      const timer = setTimeout(() => setAdded(null), ADDED_NOTICE_MS);
      return () => clearTimeout(timer);
   }, [added]);

   const returnFocus = (event: Event) => {
      const target = buttonRef.current ?? selectedRef.current?.querySelector('button');
      if (!target) return;
      event.preventDefault();
      target.focus();
   };

   const handleFile = (file: File) => {
      const fileError = getFileError(file, accept);
      setError(fileError);
      setAdded(null);
      if (!fileError) setPendingFile(file);
   };

   const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
   };

   const buttonClass = cn('min-h-11 sm:min-h-0', isTouchOnly && 'w-full');
   const errorMessage = error ? getFileErrorMessage(t, error, kind) : null;

   return (
      <div className={cn('space-y-2', className)}>
         {hint && <p className="text-sm text-muted-foreground">{hint}</p>}

         <div ref={selectedRef}>
            <FileDropzone
               onFile={handleFile}
               isTypeAllowed={(mimeType) => matchesAccept(mimeType, accept)}
               quiet={!!renderSelected}
               className={cn(
                  'rounded-md border',
                  renderSelected ? '-m-px p-0' : 'min-h-36 px-4 py-5',
               )}
            >
               {({ isDragOver, isInvalid }) => {
                  if (isDragOver)
                     return <DragMessage isInvalid={isInvalid} imagesOnly={imagesOnly} />;
                  if (renderSelected) {
                     return (
                        <div className="w-full">
                           {renderSelected({ openGallery: () => setGalleryOpen(true) })}
                        </div>
                     );
                  }
                  return (
                     <>
                        {isTouchOnly ? (
                           <Info className="h-6 w-6 text-muted-foreground" />
                        ) : (
                           <CloudUpload className="h-6 w-6 text-muted-foreground" />
                        )}
                        <p className="text-center text-sm text-muted-foreground">
                           {isTouchOnly
                              ? t(`files.field.touch.${kind}`)
                              : t(`files.field.drop.${kind}`)}
                        </p>
                        <div
                           className={cn(
                              'flex gap-2',
                              isTouchOnly ? 'w-full flex-col' : 'flex-col sm:flex-row',
                           )}
                        >
                           <Button
                              ref={setButtonRef}
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={disabled}
                              className={buttonClass}
                              onClick={() => inputRef.current?.click()}
                           >
                              <Upload />
                              {t(`files.field.choose.${kind}`)}
                           </Button>
                           <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={disabled}
                              className={buttonClass}
                              onClick={() => setGalleryOpen(true)}
                           >
                              <ImageIcon />
                              {t('files.field.chooseGallery')}
                           </Button>
                        </div>
                     </>
                  );
               }}
            </FileDropzone>
         </div>
         <input
            ref={inputRef}
            type="file"
            accept={toInputAccept(accept)}
            onChange={handleInputChange}
            className="hidden"
            tabIndex={-1}
         />

         <div role="status" className="space-y-2">
            {errorMessage && (
               <FileNotice tone="error" title={errorMessage.title} detail={errorMessage.detail} />
            )}
            {added && !renderSelected && (
               <FileNotice
                  tone="success"
                  title={t('files.field.added')}
                  detail={`${getFileDisplayName(added)} • ${formatFileSize(added.size, i18n.language)}`}
               />
            )}
         </div>

         {pendingFile && (
            <FileUploadDialog
               open
               initialFile={pendingFile}
               accept={accept}
               onOpenChange={(open) => !open && setPendingFile(null)}
               onCloseAutoFocus={returnFocus}
               onUploaded={(file) => {
                  setAdded(file);
                  onUploaded(file);
               }}
            />
         )}

         <FilePickerDialog
            open={galleryOpen}
            accept={accept}
            onCloseAutoFocus={returnFocus}
            onSelect={(file) => {
               setError(null);
               setAdded(null);
               setGalleryOpen(false);
               onSelectExisting(file);
            }}
            onClose={() => setGalleryOpen(false)}
         />
      </div>
   );
};
