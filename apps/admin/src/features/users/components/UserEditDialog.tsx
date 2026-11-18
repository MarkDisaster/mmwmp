import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { UserEntity } from '@/api/generated';
import { FormDialog } from '@/components/common/FormDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { FormInput } from '@/features/form/components/FormInput';
import { FormSelect } from '@/features/form/components/FormSelect';
import { useAssignableRoleOptions } from '@/features/users/hooks/useAssignableRoleOptions';
import { type EditUserFormValues, editUserSchema } from '@/features/users/validation/userSchemas';
import { useAuth } from '@/hooks/useAuth';

type UserEditDialogProps = {
   user: UserEntity | null;
   onClose: () => void;
};

export const UserEditDialog = ({ user, onClose }: UserEditDialogProps) => {
   const { t } = useTranslation();
   const updateUser = useMutation(api.users.mutations.adminUpdate);
   const roleOptions = useAssignableRoleOptions();
   const canChangeEmail = !!useAuth().user?.role.isAdmin;

   const methods = useForm({
      resolver: zodResolver(editUserSchema),
      defaultValues: {
         email: '',
         firstName: '',
         lastName: '',
         roleId: undefined,
      },
   });

   useEffect(() => {
      if (user) {
         methods.reset({
            email: user.email,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            roleId: user.role.id,
         });
      }
   }, [user, methods]);

   const handleSubmit = (data: EditUserFormValues) => {
      if (!user) return;
      updateUser.mutate(
         {
            id: user.id,
            data: {
               ...(canChangeEmail ? { email: data.email } : {}),
               firstName: data.firstName,
               lastName: data.lastName,
               roleId: data.roleId,
            },
         },
         {
            onSuccess: () => {
               toast.success(t('users.toast.updated'));
               onClose();
            },
         },
      );
   };

   return (
      <FormDialog
         open={user !== null}
         onClose={onClose}
         title={t('users.editTitle')}
         maxWidth="sm:max-w-100"
      >
         <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
               {user?.deactivatedAt && (
                  <p role="status" className="text-sm text-muted-foreground">
                     <Badge variant="destructive" className="mr-2">
                        {t('users.status.deactivated')}
                     </Badge>
                     {t('users.deactivatedNotice')}
                  </p>
               )}
               <FormInput
                  name="email"
                  label={t('auth.email')}
                  type="email"
                  disabled={!canChangeEmail}
                  autoFocus={canChangeEmail}
               />

               <FormInput
                  name="firstName"
                  label={t('users.profile.firstName')}
                  autoFocus={!canChangeEmail}
               />

               <FormInput name="lastName" label={t('users.profile.lastName')} />

               <FormSelect
                  name="roleId"
                  label={t('users.form.role')}
                  placeholder={t('users.form.selectRole')}
                  options={roleOptions}
               />

               <DialogFooter>
                  <Button type="button" variant="outline" onClick={onClose}>
                     {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={updateUser.isPending}>
                     {updateUser.isPending ? t('common.loading') : t('common.save')}
                  </Button>
               </DialogFooter>
            </form>
         </FormProvider>
      </FormDialog>
   );
};
