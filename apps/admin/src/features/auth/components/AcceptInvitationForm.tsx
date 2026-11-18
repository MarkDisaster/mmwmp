import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import {
   type AcceptInvitationFormValues,
   acceptInvitationSchema,
} from '@/features/auth/validation/authSchemas';
import { FormInput } from '@/features/form/components/FormInput';
import { FormPassword } from '@/features/form/components/FormPassword';

type AcceptInvitationFormProps = {
   token: string;
};

export const AcceptInvitationForm = ({ token }: AcceptInvitationFormProps) => {
   const { t } = useTranslation();
   const acceptInvitation = useMutation(api.users.mutations.acceptInvitation);

   const methods = useForm<AcceptInvitationFormValues>({
      resolver: zodResolver(acceptInvitationSchema),
      defaultValues: {
         firstName: '',
         lastName: '',
         password: '',
         confirmPassword: '',
      },
   });

   const onSubmit = (data: AcceptInvitationFormValues) => {
      acceptInvitation.mutate(
         {
            token,
            data: {
               firstName: data.firstName,
               lastName: data.lastName,
               password: data.password,
            },
         },
         {
            onSuccess: () => toast.success(t('auth.invitation.success')),
         },
      );
   };

   return (
      <FormProvider {...methods}>
         <form onSubmit={methods.handleSubmit(onSubmit)} className="w-full space-y-4">
            <FormInput name="firstName" label={t('users.profile.firstName')} />
            <FormInput name="lastName" label={t('users.profile.lastName')} />
            <FormPassword name="password" label={t('auth.password')} autoComplete="new-password" />
            <FormPassword
               name="confirmPassword"
               label={t('auth.confirmPassword')}
               autoComplete="new-password"
            />

            <Button type="submit" className="w-full" disabled={acceptInvitation.isPending}>
               {acceptInvitation.isPending ? t('common.loading') : t('auth.invitation.submit')}
            </Button>
         </form>
      </FormProvider>
   );
};
