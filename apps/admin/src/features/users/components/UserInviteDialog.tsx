import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { FormDialog } from '@/components/common/FormDialog';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { FormInput } from '@/features/form/components/FormInput';
import { FormSelect } from '@/features/form/components/FormSelect';
import { useAssignableRoleOptions } from '@/features/users/hooks/useAssignableRoleOptions';
import { type InviteFormValues, inviteSchema } from '@/features/users/validation/userSchemas';

type UserInviteDialogProps = {
   open: boolean;
   onClose: () => void;
};

export const UserInviteDialog = ({ open, onClose }: UserInviteDialogProps) => {
   const { t } = useTranslation();
   const invite = useMutation(api.users.mutations.invite);
   const roleOptions = useAssignableRoleOptions();

   const methods = useForm({
      resolver: zodResolver(inviteSchema),
      defaultValues: { email: '', roleId: undefined },
   });

   const handleClose = () => {
      methods.reset();
      onClose();
   };

   const handleSubmit = (data: InviteFormValues) => {
      invite.mutate(
         { data: { email: data.email, roleId: data.roleId } },
         {
            onSuccess: () => {
               toast.success(t('users.toast.invited'));
               handleClose();
            },
         },
      );
   };

   return (
      <FormDialog
         open={open}
         onClose={handleClose}
         title={t('users.inviteTitle')}
         maxWidth="sm:max-w-100"
      >
         <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
               <FormInput
                  name="email"
                  label={t('auth.email')}
                  type="email"
                  placeholder="user@example.com"
                  autoFocus
               />

               <FormSelect
                  name="roleId"
                  label={t('users.form.role')}
                  placeholder={t('users.form.selectRole')}
                  options={roleOptions}
               />

               <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                     {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={invite.isPending}>
                     {invite.isPending ? t('common.loading') : t('users.invite')}
                  </Button>
               </DialogFooter>
            </form>
         </FormProvider>
      </FormDialog>
   );
};
