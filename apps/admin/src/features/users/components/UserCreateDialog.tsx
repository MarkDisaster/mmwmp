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
import { FormPassword } from '@/features/form/components/FormPassword';
import { FormSelect } from '@/features/form/components/FormSelect';
import { useAssignableRoleOptions } from '@/features/users/hooks/useAssignableRoleOptions';
import {
   type CreateUserFormValues,
   createUserSchema,
} from '@/features/users/validation/userSchemas';

type UserCreateDialogProps = {
   open: boolean;
   onClose: () => void;
};

export const UserCreateDialog = ({ open, onClose }: UserCreateDialogProps) => {
   const { t } = useTranslation();
   const createUser = useMutation(api.users.mutations.create);
   const roleOptions = useAssignableRoleOptions();

   const methods = useForm({
      resolver: zodResolver(createUserSchema),
      defaultValues: { email: '', firstName: '', lastName: '', password: '', roleId: undefined },
   });

   const handleClose = () => {
      methods.reset();
      onClose();
   };

   const handleSubmit = (data: CreateUserFormValues) => {
      createUser.mutate(
         { data },
         {
            onSuccess: () => {
               toast.success(t('users.toast.created'));
               handleClose();
            },
         },
      );
   };

   return (
      <FormDialog
         open={open}
         onClose={handleClose}
         title={t('users.createTitle')}
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

               <FormInput name="firstName" label={t('users.profile.firstName')} />

               <FormInput name="lastName" label={t('users.profile.lastName')} />

               <FormPassword name="password" label={t('users.form.password')} />

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
                  <Button type="submit" disabled={createUser.isPending}>
                     {createUser.isPending ? t('common.loading') : t('users.createBtn')}
                  </Button>
               </DialogFooter>
            </form>
         </FormProvider>
      </FormDialog>
   );
};
