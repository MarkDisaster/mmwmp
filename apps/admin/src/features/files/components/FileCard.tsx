import { cn } from '@mm/utils/cn';
import { AlertCircle, Copy, Loader2, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { FileEntity } from '@/api/generated';
import { LanguageBadge } from '@/components/common/LanguageBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileThumbnail } from '@/features/files/components/FileThumbnail';
import { useCopyFileUrl } from '@/features/files/hooks/useCopyFileUrl';
import { onActivateKey } from '@/utils/a11y';
import { formatFileSize, getFileDisplayName, isFileProcessing } from '@/utils/file';
import { PREVIEW_CARD_INTERACTIVE_CLASS } from '@/utils/previewCard';

type FileCardProps = {
   file: FileEntity;
   onPreview: (file: FileEntity) => void;
   onEdit?: (file: FileEntity) => void;
   onDelete?: (file: FileEntity) => void;
};

const CardPreview = ({ file }: { file: FileEntity }) => {
   const { t } = useTranslation();

   if (isFileProcessing(file)) {
      return (
         <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>
               {file.processingStatus === 'PENDING'
                  ? t('files.processing.pending')
                  : t('files.processing.processing')}
            </span>
         </div>
      );
   }

   if (file.processingStatus === 'FAILED') {
      return (
         <div
            className="flex flex-col items-center gap-2 text-xs text-destructive"
            title={file.processingError ?? undefined}
         >
            <AlertCircle className="h-6 w-6" />
            <span>{t('files.processing.failed')}</span>
         </div>
      );
   }

   return <FileThumbnail file={file} className="h-full w-full" iconClassName="h-10 w-10" />;
};

export const FileCard = ({ file, onPreview, onEdit, onDelete }: FileCardProps) => {
   const { t, i18n } = useTranslation();
   const displayName = getFileDisplayName(file);

   const copyFileUrl = useCopyFileUrl();

   return (
      <Card className={cn('group', PREVIEW_CARD_INTERACTIVE_CLASS)}>
         <div
            className="flex aspect-5/3 cursor-pointer items-center justify-center bg-muted"
            role="button"
            tabIndex={0}
            onClick={() => onPreview(file)}
            onKeyDown={onActivateKey(() => onPreview(file))}
         >
            <CardPreview file={file} />
         </div>
         <div className="flex flex-col px-3 py-2">
            <p className="truncate text-sm font-medium" title={displayName}>
               {displayName}
            </p>
            <div className="relative">
               <div className="flex h-8 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  <span className="shrink-0">{formatFileSize(file.size, i18n.language)}</span>
                  {file.language ? (
                     <LanguageBadge language={file.language} />
                  ) : (
                     <span className="shrink-0">—</span>
                  )}
                  {file.width && file.height && (
                     <span className="min-w-0 truncate">
                        {file.width}×{file.height}
                     </span>
                  )}
               </div>
               <div className="pointer-events-none absolute inset-0 flex items-center justify-end gap-0.5 bg-card opacity-0 transition-opacity group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:static [@media(hover:none)]:opacity-100">
                  <Button
                     variant="ghost"
                     size="icon-sm"
                     aria-label={t('files.table.copyUrl')}
                     onClick={() => copyFileUrl(file.publicUrl)}
                  >
                     <Copy className="h-3.5 w-3.5" />
                  </Button>
                  {onEdit && (
                     <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('common.edit')}
                        onClick={() => onEdit(file)}
                     >
                        <Pencil className="h-3.5 w-3.5" />
                     </Button>
                  )}
                  {onDelete && (
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`${t('files.delete.title')} ${displayName}`}
                              onClick={() => onDelete(file)}
                           >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                           </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('files.delete.title')}</TooltipContent>
                     </Tooltip>
                  )}
               </div>
            </div>
         </div>
      </Card>
   );
};
