import { Loader2, XIcon } from 'lucide-react';
import { AlertDialog } from 'radix-ui';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { dialogClasses } from '@/components/ui/variants';

type ConfirmDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: () => void;
   title: string;
   description: string;
   confirmLabel: string;
   cancelLabel: string;
   destructive?: boolean;
   isPending?: boolean;
};

function ConfirmDialog({
   open,
   onOpenChange,
   onConfirm,
   title,
   description,
   confirmLabel,
   cancelLabel,
   destructive = false,
   isPending = false,
}: ConfirmDialogProps) {
   const { t } = useTranslation();

   return (
      <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
         <AlertDialog.Portal>
            <AlertDialog.Overlay className={dialogClasses.overlay} />
            <AlertDialog.Content className={dialogClasses.content}>
               <DialogHeader>
                  <AlertDialog.Title className={dialogClasses.title}>{title}</AlertDialog.Title>
                  <AlertDialog.Description className={dialogClasses.description}>
                     {description}
                  </AlertDialog.Description>
               </DialogHeader>
               <DialogFooter>
                  <AlertDialog.Cancel asChild>
                     <Button variant="outline">{cancelLabel}</Button>
                  </AlertDialog.Cancel>
                  <Button
                     variant={destructive ? 'destructive' : 'default'}
                     onClick={onConfirm}
                     disabled={isPending}
                  >
                     {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     {confirmLabel}
                  </Button>
               </DialogFooter>
               <button
                  type="button"
                  className={dialogClasses.close}
                  onClick={() => onOpenChange(false)}
               >
                  <XIcon />
                  <span className="sr-only">{t('common.close')}</span>
               </button>
            </AlertDialog.Content>
         </AlertDialog.Portal>
      </AlertDialog.Root>
   );
}

export { ConfirmDialog };
