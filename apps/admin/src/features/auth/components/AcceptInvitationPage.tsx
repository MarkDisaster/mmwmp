import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { AcceptInvitationForm } from './AcceptInvitationForm';

type AcceptInvitationPageProps = {
   token: string;
};

export const AcceptInvitationPage = ({ token }: AcceptInvitationPageProps) => {
   const { t } = useTranslation();
   const verify = useQuery(api.users.queries.verifyInvitation(token));

   if (verify.isPending) {
      return (
         <div className="flex min-h-screen items-center justify-center">
            <p className="text-muted-foreground">{t('common.loading')}</p>
         </div>
      );
   }

   if (verify.isError) {
      return (
         <div className="flex min-h-screen items-center justify-center">
            <Card className="w-full max-w-sm">
               <CardHeader>
                  <CardTitle>{t('auth.invitation.invalidTitle')}</CardTitle>
                  <CardDescription>{t('auth.invitation.invalidDescription')}</CardDescription>
               </CardHeader>
            </Card>
         </div>
      );
   }

   return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         <Card className="w-full max-w-sm">
            <CardHeader>
               <CardTitle>{t('auth.invitation.title')}</CardTitle>
               <CardDescription>{t('auth.invitation.description')}</CardDescription>
            </CardHeader>
            <CardContent>
               <AcceptInvitationForm token={token} />
            </CardContent>
         </Card>
      </div>
   );
};
