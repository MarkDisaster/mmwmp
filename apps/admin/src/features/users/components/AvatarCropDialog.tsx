import { cn } from '@mm/utils/cn';
import { Upload } from 'lucide-react';
import type { ChangeEvent, DragEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { Area } from 'react-easy-crop';
import Cropper from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { useObjectUrl } from '@/hooks/useObjectUrl';

type AvatarCropDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: (blob: Blob) => void;
   isPending?: boolean;
};

const ACCEPTED_MIME = /^image\/(jpeg|png|webp|gif)$/;

const getCroppedBlob = async (imageSrc: string, croppedAreaPixels: Area): Promise<Blob> => {
   const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageSrc;
   });

   const canvas = document.createElement('canvas');
   canvas.width = croppedAreaPixels.width;
   canvas.height = croppedAreaPixels.height;

   const ctx = canvas.getContext('2d');
   if (!ctx) throw new Error('Could not get canvas 2D context');

   ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
   );

   return new Promise((resolve, reject) => {
      canvas.toBlob(
         (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
         'image/webp',
         0.9,
      );
   });
};

export const AvatarCropDialog = ({
   open,
   onOpenChange,
   onConfirm,
   isPending,
}: AvatarCropDialogProps) => {
   const { t } = useTranslation();
   const inputRef = useRef<HTMLInputElement>(null);
   const [file, setFile] = useState<File | null>(null);
   const imageSrc = useObjectUrl(file);
   const [isDragOver, setIsDragOver] = useState(false);
   const [crop, setCrop] = useState({ x: 0, y: 0 });
   const [zoom, setZoom] = useState(1);
   const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

   const handleFile = (selected: File) => {
      if (!ACCEPTED_MIME.test(selected.type)) {
         toast.error(t('users.profile.avatar.toast.invalidType'));
         return;
      }
      setFile(selected);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
   };

   const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
      e.target.value = '';
   };

   const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const selected = e.dataTransfer.files?.[0];
      if (selected) handleFile(selected);
   };

   const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
   };

   const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
      setCroppedAreaPixels(areaPixels);
   }, []);

   const handleClearImage = () => {
      setFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
   };

   const handleConfirm = async () => {
      if (!croppedAreaPixels || !imageSrc) return;
      try {
         const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
         onConfirm(blob);
      } catch {
         toast.error(t('users.profile.avatar.toast.processError'));
         handleClearImage();
      }
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="max-w-lg">
            <DialogHeader>
               <DialogTitle>{t('users.profile.avatar.uploadTitle')}</DialogTitle>
            </DialogHeader>

            {!imageSrc ? (
               <>
                  <div
                     role="button"
                     tabIndex={0}
                     onDrop={handleDrop}
                     onDragOver={handleDragOver}
                     onDragLeave={() => setIsDragOver(false)}
                     onClick={() => inputRef.current?.click()}
                     onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
                     className={cn(
                        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors',
                        isDragOver
                           ? 'border-primary bg-primary/5'
                           : 'border-muted-foreground/25 hover:border-primary/50',
                     )}
                  >
                     <Upload className="h-10 w-10 text-muted-foreground" />
                     <p className="text-sm text-muted-foreground">
                        {isDragOver
                           ? t('files.uploadDialog.dropHere')
                           : t('users.profile.avatar.dropzoneText')}
                     </p>
                     <p className="text-xs text-muted-foreground/60">
                        {t('users.profile.avatar.hint')}
                     </p>
                  </div>
                  <input
                     ref={inputRef}
                     type="file"
                     accept="image/jpeg,image/png,image/webp,image/gif"
                     className="hidden"
                     onChange={handleInputChange}
                  />
               </>
            ) : (
               <>
                  <div className="relative h-80 w-full overflow-hidden rounded-lg bg-black">
                     <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                     />
                  </div>

                  <div className="flex items-center gap-3 px-1">
                     <span className="text-xs text-muted-foreground">−</span>
                     <input
                        type="range"
                        aria-label={t('users.profile.avatar.zoom')}
                        min={1}
                        max={3}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1"
                     />
                     <span className="text-xs text-muted-foreground">+</span>
                  </div>

                  <DialogFooter>
                     <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                     >
                        {t('common.cancel')}
                     </Button>
                     <Button variant="outline" onClick={handleClearImage} disabled={isPending}>
                        {t('users.profile.avatar.clearImage')}
                     </Button>
                     <Button onClick={handleConfirm} disabled={isPending}>
                        {isPending ? t('common.loading') : t('users.profile.avatar.cropConfirm')}
                     </Button>
                  </DialogFooter>
               </>
            )}
         </DialogContent>
      </Dialog>
   );
};
