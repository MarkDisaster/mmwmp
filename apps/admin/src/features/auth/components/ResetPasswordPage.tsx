import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
   type ResetPasswordFormValues,
   resetPasswordSchema,
} from '@/features/auth/validation/authSchemas';
import { FormPassword } from '@/features/form/components/FormPassword';
import { getHttpErrorMessageKey, isBadRequestWithTextMessage } from '@/utils/httpError';

type ResetPasswordPageProps = {
   token: string;
};

export const ResetPasswordPage = ({ token }: ResetPasswordPageProps) => {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const resetPassword = useMutation(api.auth.mutations.resetPassword);

   const methods = useForm<ResetPasswordFormValues>({
      resolver: zodResolver(resetPasswordSchema),
      defaultValues: { newPassword: '', confirmPassword: '' },
   });

   const onSubmit = (data: ResetPasswordFormValues) => {
      resetPassword.mutate(
         { data: { token, newPassword: data.newPassword } },
         {
            onSuccess: () => {
               toast.success(t('auth.resetPasswordSuccess'));
               navigate({ to: '/login' });
            },
         },
      );
   };

   const isInvalidLink = isBadRequestWithTextMessage(resetPassword.error);
   const errorMessageKey =
      resetPassword.isError && !isInvalidLink
         ? (getHttpErrorMessageKey(resetPassword.error) ?? 'common.mutationError')
         : undefined;

   return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <Card className="w-full max-w-sm">
            <CardHeader>
               <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
               <CardDescription>{t('auth.resetPasswordDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
               <FormProvider {...methods}>
                  <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                     <FormPassword name="newPassword" label={t('users.profile.newPassword')} />
                     <FormPassword name="confirmPassword" label={t('auth.confirmPassword')} />

                     {isInvalidLink && (
                        <p role="alert" className="text-sm text-destructive">
                           {t('auth.resetPasswordInvalidLink')}{' '}
                           <Link to="/forgot-password" className="underline">
                              {t('auth.resetPasswordRequestNewLink')}
                           </Link>
                        </p>
                     )}

                     {errorMessageKey && (
                        <p role="alert" className="text-sm text-destructive">
                           {t(errorMessageKey)}
                        </p>
                     )}

                     <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
                        {resetPassword.isPending
                           ? t('common.loading')
                           : t('auth.resetPasswordSubmit')}
                     </Button>
                  </form>
               </FormProvider>
            </CardContent>
         </Card>
      </div>
   );
};
