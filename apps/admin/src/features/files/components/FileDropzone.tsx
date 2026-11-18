import { cn } from '@mm/utils/cn';
import { type DragEvent, type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { onActivateKey } from '@/utils/a11y';

export type DropzoneState = {
   isDragOver: boolean;
   isInvalid: boolean;
};

type FileDropzoneProps = {
   onFile: (file: File) => void;
   isTypeAllowed?: (mimeType: string) => boolean;
   onClick?: () => void;
   children: ReactNode | ((state: DropzoneState) => ReactNode);
   className?: string;
   quiet?: boolean;
};

const getBorderClass = (
   { isDragOver, isInvalid }: DropzoneState,
   quiet: boolean,
   clickable: boolean,
) => {
   if (isDragOver)
      return isInvalid ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5';
   if (quiet) return 'border-transparent';
   return cn('border-muted-foreground/25', clickable && 'hover:border-primary/50');
};

export const FileDropzone = ({
   onFile,
   isTypeAllowed,
   onClick,
   children,
   className,
   quiet,
}: FileDropzoneProps) => {
   const { t } = useTranslation();
   const [state, setState] = useState<DropzoneState | null>(null);

   const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setState(null);
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
   };

   const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      const mimeType = e.dataTransfer.items[0]?.type;
      const isInvalid = !!mimeType && !!isTypeAllowed && !isTypeAllowed(mimeType);
      setState((prev) => (prev?.isInvalid === isInvalid ? prev : { isDragOver: true, isInvalid }));
   };

   const handleDragLeave = (e: DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setState(null);
   };

   const current: DropzoneState = state ?? { isDragOver: false, isInvalid: false };

   return (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions
      <div
         role={onClick ? 'button' : undefined}
         tabIndex={onClick ? 0 : undefined}
         onClick={onClick}
         onKeyDown={onClick ? onActivateKey(onClick) : undefined}
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors',
            'outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50',
            onClick && 'cursor-pointer',
            getBorderClass(current, !!quiet, !!onClick),
            className,
         )}
      >
         {typeof children === 'function' ? children(current) : children}
         <span role="status" className="sr-only">
            {current.isDragOver && !current.isInvalid ? t('files.uploadDialog.dropHere') : ''}
         </span>
      </div>
   );
};
