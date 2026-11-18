'use client';

import { cn } from '@mm/utils/cn';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { dialogClasses } from '@/components/ui/variants';

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
   return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: ComponentProps<typeof DialogPrimitive.Trigger>) {
   return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: ComponentProps<typeof DialogPrimitive.Portal>) {
   return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: ComponentProps<typeof DialogPrimitive.Close>) {
   return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
   return (
      <DialogPrimitive.Overlay
         data-slot="dialog-overlay"
         className={cn(dialogClasses.overlay, className)}
         {...props}
      />
   );
}

function DialogContent({
   className,
   children,
   showCloseButton = true,
   ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
   showCloseButton?: boolean;
}) {
   const { t } = useTranslation();

   return (
      <DialogPortal data-slot="dialog-portal">
         <DialogOverlay />
         <DialogPrimitive.Content
            data-slot="dialog-content"
            className={cn(dialogClasses.content, className)}
            {...props}
         >
            {children}
            {showCloseButton && (
               <DialogPrimitive.Close data-slot="dialog-close" className={dialogClasses.close}>
                  <XIcon />
                  <span className="sr-only">{t('common.close')}</span>
               </DialogPrimitive.Close>
            )}
         </DialogPrimitive.Content>
      </DialogPortal>
   );
}

function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
   return (
      <div
         data-slot="dialog-header"
         className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
         {...props}
      />
   );
}

function DialogFooter({
   className,
   showCloseButton = false,
   children,
   ...props
}: ComponentProps<'div'> & {
   showCloseButton?: boolean;
}) {
   const { t } = useTranslation();

   return (
      <div
         data-slot="dialog-footer"
         className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
         {...props}
      >
         {children}
         {showCloseButton && (
            <DialogPrimitive.Close asChild>
               <Button variant="outline">{t('common.close')}</Button>
            </DialogPrimitive.Close>
         )}
      </div>
   );
}

function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
   return (
      <DialogPrimitive.Title
         data-slot="dialog-title"
         className={cn(dialogClasses.title, className)}
         {...props}
      />
   );
}

function DialogDescription({
   className,
   ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
   return (
      <DialogPrimitive.Description
         data-slot="dialog-description"
         className={cn(dialogClasses.description, className)}
         {...props}
      />
   );
}

type DialogLayoutProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   title: string;
   description?: string;
   children?: ReactNode;
   footer?: ReactNode;
};

function DialogLayout({
   open,
   onOpenChange,
   title,
   description,
   children,
   footer,
}: DialogLayoutProps) {
   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>{title}</DialogTitle>
               {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
            {children}
            {footer && <DialogFooter>{footer}</DialogFooter>}
         </DialogContent>
      </Dialog>
   );
}

export {
   Dialog,
   DialogClose,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogLayout,
   DialogOverlay,
   DialogPortal,
   DialogTitle,
   DialogTrigger,
};
