import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { LoginForm } from './LoginForm';

export const LoginPage = () => {
   const { t } = useTranslation();

   return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <Card className="w-full max-w-sm">
            <CardHeader>
               <CardTitle>{t('auth.loginTitle')}</CardTitle>
               <CardDescription>{t('auth.loginDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
               <LoginForm />
            </CardContent>
         </Card>
      </div>
   );
};
