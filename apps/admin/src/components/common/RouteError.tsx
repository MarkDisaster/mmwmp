import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { type ErrorComponentProps, Link, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export const RouteError = ({ error }: ErrorComponentProps) => {
   const { t } = useTranslation();
   const router = useRouter();
   const queryErrorResetBoundary = useQueryErrorResetBoundary();

   useEffect(() => {
      queryErrorResetBoundary.reset();
   }, [queryErrorResetBoundary]);

   return (
      <div role="alert" className="flex flex-col items-center gap-4 px-4 py-16 text-center">
         <h1 className="text-2xl font-semibold">{t('common.error')}</h1>
         <p className="text-sm text-muted-foreground">{t('common.routeErrorDescription')}</p>
         {import.meta.env.DEV && (
            <pre className="max-w-full overflow-x-auto text-xs text-muted-foreground">
               {error.message}
            </pre>
         )}
         <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => void router.invalidate()}>{t('common.retry')}</Button>
            <Button variant="outline" asChild>
               <Link to="/">{t('common.backHome')}</Link>
            </Button>
         </div>
      </div>
   );
};
