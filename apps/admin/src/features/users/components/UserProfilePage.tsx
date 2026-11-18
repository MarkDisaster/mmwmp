import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { EditorFormSkeleton } from '@/components/common/EditorFormSkeleton';
import { FormSection } from '@/components/common/FormSection';
import { PageHeader } from '@/components/common/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { endAuthSession } from '@/features/auth/auth-query';
import { FormInput } from '@/features/form/components/FormInput';
import { FormPassword } from '@/features/form/components/FormPassword';
import { AvatarCropDialog } from '@/features/users/components/AvatarCropDialog';
import {
   type PasswordFormValues,
   passwordSchema,
   type ProfileFormValues,
   profileSchema,
} from '@/features/users/validation/userSchemas';
import { getUserInitials } from '@/utils/user';

export const UserProfilePage = () => {
   const { t } = useTranslation();
   const { data: user, isLoading } = useQuery(api.users.queries.me);
   const updateName = useMutation(api.users.mutations.updateName);
   const changePassword = useMutation(api.users.mutations.changePassword);
   const updateAvatar = useMutation(api.users.mutations.updateAvatar);
   const deleteAvatar = useMutation(api.users.mutations.deleteAvatar);

   const [avatarOpen, setAvatarOpen] = useState(false);
   const [avatarDialogKey, setAvatarDialogKey] = useState(0);
   const [deleteAvatarOpen, setDeleteAvatarOpen] = useState(false);

   const profileMethods = useForm<ProfileFormValues>({
      resolver: zodResolver(profileSchema),
      values: {
         firstName: user?.firstName ?? '',
         lastName: user?.lastName ?? '',
      },
   });

   const passwordMethods = useForm<PasswordFormValues>({
      resolver: zodResolver(passwordSchema),
      defaultValues: { currentPassword: '', newPassword: '' },
   });

   const handleSave = (data: ProfileFormValues) => {
      updateName.mutate(
         { data },
         {
            onSuccess: () => toast.success(t('users.toast.profileSaved')),
         },
      );
   };

   const handlePasswordSave = (data: PasswordFormValues) => {
      changePassword.mutate(
         { data },
         {
            onSuccess: () => {
               endAuthSession({ reason: 'logout' });
               toast.success(t('users.toast.passwordChanged'));
            },
         },
      );
   };

   const handleCropConfirm = (blob: Blob) => {
      updateAvatar.mutate(
         { blob },
         {
            onSuccess: () => {
               toast.success(t('users.profile.avatar.toast.uploaded'));
               setAvatarOpen(false);
            },
            onError: () => setAvatarOpen(false),
         },
      );
   };

   const handleDeleteAvatar = () => {
      deleteAvatar.mutate(undefined, {
         onSuccess: () => {
            toast.success(t('users.profile.avatar.toast.deleted'));
            setDeleteAvatarOpen(false);
         },
      });
   };

   const initials = getUserInitials(user?.firstName, user?.lastName, user?.email);

   if (isLoading) {
      return (
         <EditorFormSkeleton
            headerButtons={0}
            stickyHeader={false}
            main={[
               ['avatar', 'input', 'responsivePair', 'button'],
               ['input', 'input', 'button'],
            ]}
         />
      );
   }

   return (
      <div className="space-y-6">
         <div className="py-3">
            <PageHeader title={t('users.profile.title')} />
         </div>

         <div className="max-w-2xl space-y-10">
            <FormSection title={t('users.profile.sections.personal')}>
               <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                     <AvatarImage src={user?.avatarUrl ?? undefined} />
                     <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                        {initials}
                     </AvatarFallback>
                  </Avatar>
                  <div className="flex gap-2">
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                           setAvatarDialogKey((key) => key + 1);
                           setAvatarOpen(true);
                        }}
                        disabled={updateAvatar.isPending || deleteAvatar.isPending}
                     >
                        {t('users.profile.avatar.upload')}
                     </Button>
                     {user?.avatarUrl && (
                        <Button
                           variant="destructive"
                           size="sm"
                           onClick={() => setDeleteAvatarOpen(true)}
                           disabled={updateAvatar.isPending || deleteAvatar.isPending}
                        >
                           {t('users.profile.avatar.delete')}
                        </Button>
                     )}
                  </div>
               </div>

               <div className="space-y-2">
                  <Label htmlFor="profile-email">{t('auth.email')}</Label>
                  <Input id="profile-email" value={user?.email ?? ''} disabled />
               </div>

               <FormProvider {...profileMethods}>
                  <form onSubmit={profileMethods.handleSubmit(handleSave)} className="space-y-4">
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormInput name="firstName" label={t('users.profile.firstName')} />
                        <FormInput name="lastName" label={t('users.profile.lastName')} />
                     </div>
                     <Button type="submit" disabled={updateName.isPending}>
                        {updateName.isPending ? t('common.loading') : t('common.save')}
                     </Button>
                  </form>
               </FormProvider>
            </FormSection>

            <FormSection title={t('users.profile.changePassword')}>
               <FormProvider {...passwordMethods}>
                  <form
                     onSubmit={passwordMethods.handleSubmit(handlePasswordSave)}
                     className="space-y-4"
                  >
                     <FormPassword
                        name="currentPassword"
                        label={t('users.profile.currentPassword')}
                     />
                     <FormPassword name="newPassword" label={t('users.profile.newPassword')} />
                     <Button type="submit" disabled={changePassword.isPending}>
                        {changePassword.isPending
                           ? t('common.loading')
                           : t('users.profile.changePasswordBtn')}
                     </Button>
                  </form>
               </FormProvider>
            </FormSection>
         </div>

         <AvatarCropDialog
            key={avatarDialogKey}
            open={avatarOpen}
            onOpenChange={setAvatarOpen}
            onConfirm={handleCropConfirm}
            isPending={updateAvatar.isPending}
         />

         <DeleteDialog
            open={deleteAvatarOpen}
            onOpenChange={setDeleteAvatarOpen}
            onConfirm={handleDeleteAvatar}
            isPending={deleteAvatar.isPending}
            title={t('users.profile.avatar.deleteTitle')}
            description={t('users.profile.avatar.deleteDescription')}
            confirmLabel={t('common.delete')}
            cancelLabel={t('common.cancel')}
         />
      </div>
   );
};
