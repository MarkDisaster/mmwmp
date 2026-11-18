import { cn } from '@mm/utils/cn';
import { File as FileIcon, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useObjectUrl } from '@/hooks/useObjectUrl';

import type { ChatAttachment } from '../types/aiChat';

type Props = {
   attachment: ChatAttachment;
   onRemove: () => void;
   disabled?: boolean;
};

export const AiChatAttachmentPreview = ({ attachment, onRemove, disabled }: Props) => {
   const { t } = useTranslation();
   const isImage = attachment.mimeType.startsWith('image/');
   const previewUrl = useObjectUrl(isImage ? attachment.file : null);

   return (
      <div
         className={cn(
            'group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted',
            attachment.uploadFailed && 'border-destructive',
         )}
         title={attachment.name}
      >
         {previewUrl ? (
            <img src={previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
         ) : (
            <FileIcon className="size-6" aria-hidden />
         )}

         <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={t('chat.attachment.remove')}
            className={cn(
               'absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-background focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
               'disabled:cursor-not-allowed disabled:opacity-50',
            )}
         >
            <X className="size-3" />
         </button>
      </div>
   );
};
