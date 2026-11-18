import { cn } from '@mm/utils/cn';
import { Copy, ExternalLink, File as FileIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getLargeUrl, isImageMimeType } from '@/utils/file';

type PreviewSize = { compact: boolean };

const ImagePreview = ({ file, compact }: { file: FileEntity } & PreviewSize) => (
   <img
      src={getLargeUrl(file)}
      alt={file.originalName}
      className={cn('max-w-full rounded-lg object-contain', compact ? 'max-h-40' : 'max-h-[60dvh]')}
   />
);

const VideoPreview = ({ file, compact }: { file: FileEntity } & PreviewSize) => (
   <video
      src={file.publicUrl}
      controls={!compact}
      className={cn('max-w-full rounded-lg', compact ? 'max-h-40' : 'max-h-[60dvh]')}
   />
);

const FileFallback = ({ file, compact }: { file: FileEntity } & PreviewSize) => {
   const { t } = useTranslation();

   return (
      <div
         className={cn(
            'flex w-full flex-col items-center justify-center gap-4 rounded-xl bg-muted p-2',
            compact ? 'h-40' : 'min-h-48 py-8',
         )}
      >
         <FileIcon className="h-16 w-16 text-muted-foreground" />
         {!compact && (
            <Button asChild variant="outline">
               <a
                  href={file.publicUrl}
                  download={file.originalName}
                  target="_blank"
                  rel="noreferrer"
               >
                  {t('files.preview.download')}
               </a>
            </Button>
         )}
      </div>
   );
};

const PreviewActions = ({ file, onCopyUrl }: { file: FileEntity; onCopyUrl: () => void }) => {
   const { t } = useTranslation();

   return (
      <div className="absolute top-3 right-3 flex gap-1">
         <Tooltip>
            <TooltipTrigger asChild>
               <Button
                  variant="secondary"
                  size="icon-sm"
                  aria-label={t('files.preview.copyUrl')}
                  onClick={onCopyUrl}
               >
                  <Copy />
               </Button>
            </TooltipTrigger>
            <TooltipContent>{t('files.preview.copyUrl')}</TooltipContent>
         </Tooltip>
         <Tooltip>
            <TooltipTrigger asChild>
               <Button asChild variant="secondary" size="icon-sm">
                  <a
                     href={file.publicUrl}
                     target="_blank"
                     rel="noreferrer"
                     aria-label={t('files.preview.openOriginal')}
                  >
                     <ExternalLink />
                  </a>
               </Button>
            </TooltipTrigger>
            <TooltipContent>{t('files.preview.openOriginal')}</TooltipContent>
         </Tooltip>
      </div>
   );
};

type FilePreviewProps = {
   file: FileEntity;
   compact?: boolean;
   onCopyUrl?: () => void;
};

const getPreviewContent = (mimeType: string) => {
   if (isImageMimeType(mimeType)) return ImagePreview;
   if (mimeType.startsWith('video/')) return VideoPreview;
   return FileFallback;
};

export const FilePreview = ({ file, compact = false, onCopyUrl }: FilePreviewProps) => {
   const Content = getPreviewContent(file.mimeType);

   return (
      <div className={cn('relative', !compact && 'flex justify-center')}>
         <Content file={file} compact={compact} />
         {onCopyUrl && <PreviewActions file={file} onCopyUrl={onCopyUrl} />}
      </div>
   );
};
