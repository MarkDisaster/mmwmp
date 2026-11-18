import type { ReactNode } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FormDialogProps = {
   open: boolean;
   onClose: () => void;
   title: string;
   maxWidth?: string;
   children: ReactNode;
};

export const FormDialog = ({
   open,
   onClose,
   title,
   maxWidth = 'sm:max-w-125',
   children,
}: FormDialogProps) => (
   <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={maxWidth}>
         <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
         </DialogHeader>
         {children}
      </DialogContent>
   </Dialog>
);
