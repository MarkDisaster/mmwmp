import { ConfirmDialog } from '@/components/common/ConfirmDialog';

type DeleteDialogProps = {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   onConfirm: () => void;
   isPending: boolean;
   title: string;
   description: string;
   confirmLabel: string;
   cancelLabel: string;
};

function DeleteDialog(props: DeleteDialogProps) {
   return <ConfirmDialog {...props} destructive />;
}

export { DeleteDialog };
