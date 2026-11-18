import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useAuthLogin } from '@/features/auth/hooks/useAuthLogin';
import { useCountdown } from '@/features/auth/hooks/useCountdown';
import { type LoginFormValues, loginSchema } from '@/features/auth/validation/authSchemas';
import { FormInput } from '@/features/form/components/FormInput';
import { FormPassword } from '@/features/form/components/FormPassword';

const formatSeconds = (seconds: number) => {
   const m = Math.floor(seconds / 60);
   const s = seconds % 60;
   return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
};

export const LoginForm = () => {
   const { t } = useTranslation();
   const { mutate, isPending, isError, rateLimitError } = useAuthLogin();
   const [trackedRateLimit, setTrackedRateLimit] = useState(rateLimitError);
   const [retryAt, setRetryAt] = useState<number | null>(null);
   if (rateLimitError !== trackedRateLimit) {
      setTrackedRateLimit(rateLimitError);
      setRetryAt(rateLimitError ? Date.now() + rateLimitError.retryAfterSeconds * 1000 : null);
   }
   const countdown = useCountdown(retryAt);

   const methods = useForm<LoginFormValues>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
         email: '',
         password: '',
      },
   });

   const onSubmit = (data: LoginFormValues) => {
      mutate(data);
   };

   const isLocked = countdown > 0;

   return (
      <FormProvider {...methods}>
         <form onSubmit={methods.handleSubmit(onSubmit)} className="w-full space-y-4">
            <FormInput name="email" label={t('auth.email')} type="email" autoComplete="email" />

            <FormPassword
               name="password"
               label={t('auth.password')}
               autoComplete="current-password"
            />

            {isError && !rateLimitError && (
               <p className="text-sm text-destructive">{t('auth.invalidCredentials')}</p>
            )}

            {isLocked && (
               <p className="text-sm text-destructive">
                  {t('auth.rateLimited', { time: formatSeconds(countdown) })}
               </p>
            )}

            <Button
               type="submit"
               className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
               disabled={isPending || isLocked}
            >
               {isPending ? t('common.loading') : t('auth.login')}
            </Button>

            <div className="text-center text-sm">
               <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                  {t('auth.forgotPassword')}
               </Link>
            </div>
         </form>
      </FormProvider>
   );
};
