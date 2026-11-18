import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
   type ForgotPasswordFormValues,
   forgotPasswordSchema,
} from '@/features/auth/validation/authSchemas';
import { FormInput } from '@/features/form/components/FormInput';
import { getHttpErrorMessageKey } from '@/utils/httpError';

export const ForgotPasswordPage = () => {
   const { t } = useTranslation();
   const forgotPassword = useMutation(api.auth.mutations.forgotPassword);

   const methods = useForm<ForgotPasswordFormValues>({
      resolver: zodResolver(forgotPasswordSchema),
      defaultValues: { email: '' },
   });

   const onSubmit = (data: ForgotPasswordFormValues) => {
      forgotPassword.mutate({ data: { email: data.email } });
   };

   const errorMessageKey = forgotPassword.isError
      ? (getHttpErrorMessageKey(forgotPassword.error) ?? 'common.mutationError')
      : undefined;

   return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <Card className="w-full max-w-sm">
            <CardHeader>
               <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
               <CardDescription>{t('auth.forgotPasswordDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
               {forgotPassword.isSuccess ? (
                  <p className="text-sm">{t('auth.forgotPasswordSuccess')}</p>
               ) : (
                  <FormProvider {...methods}>
                     <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                        <FormInput
                           name="email"
                           label={t('auth.email')}
                           type="email"
                           autoComplete="email"
                        />

                        {errorMessageKey && (
                           <p role="alert" className="text-sm text-destructive">
                              {t(errorMessageKey)}
                           </p>
                        )}

                        <Button
                           type="submit"
                           className="w-full"
                           disabled={forgotPassword.isPending}
                        >
                           {forgotPassword.isPending
                              ? t('common.loading')
                              : t('auth.forgotPasswordSubmit')}
                        </Button>
                     </form>
                  </FormProvider>
               )}

               <div className="mt-4 text-center text-sm">
                  <Link to="/login" className="text-muted-foreground hover:text-foreground">
                     {t('auth.login')}
                  </Link>
               </div>
            </CardContent>
         </Card>
      </div>
   );
};
