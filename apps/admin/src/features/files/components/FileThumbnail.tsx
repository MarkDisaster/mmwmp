import { cn } from '@mm/utils/cn';
import { File as FileIcon } from 'lucide-react';

import type { FileEntity } from '@/api/generated';
import { getFileDisplayName, getThumbnailUrl } from '@/utils/file';

type FileThumbnailProps = {
   file: FileEntity;
   className?: string;
   iconClassName?: string;
};

export const FileThumbnail = ({ file, className, iconClassName }: FileThumbnailProps) => {
   const thumbnailUrl = getThumbnailUrl(file);

   if (!thumbnailUrl) {
      return <FileIcon aria-hidden className={cn('text-muted-foreground', iconClassName)} />;
   }

   return (
      <img
         src={thumbnailUrl}
         alt={getFileDisplayName(file)}
         className={cn('object-cover', className)}
      />
   );
};
