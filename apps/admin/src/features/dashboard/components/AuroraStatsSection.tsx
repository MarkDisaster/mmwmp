import { useQuery } from '@tanstack/react-query';
import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCount, getStartOfLocalDay } from '@/features/dashboard/utils/auroraStats';
import { useAuth } from '@/hooks/useAuth';

import { StatItem } from './StatItem';

export const AuroraStatsSection = () => {
   const { t, i18n } = useTranslation();
   const locale = i18n.language;
   const from = getStartOfLocalDay(new Date());
   const isAdmin = !!useAuth().user?.role.isAdmin;
   const { data, isLoading, isError } = useQuery({
      ...api.aiObservability.queries.summary({ from }),
      enabled: isAdmin,
   });

   const errorCount = data?.errorCount ?? 0;

   if (!isAdmin) return null;

   return (
      <Card>
         <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
               <Bot className="h-5 w-5" />
               {t('dashboard.aurora.title')}
            </CardTitle>
         </CardHeader>
         <CardContent>
            {isError ? (
               <p className="text-sm text-muted-foreground">{t('dashboard.aurora.error')}</p>
            ) : (
               <div className="flex flex-wrap gap-x-8 gap-y-4">
                  <StatItem
                     title={t('dashboard.aurora.turns')}
                     hint={t('dashboard.aurora.turnsHint')}
                     value={formatCount(data?.interactionCount ?? 0, locale)}
                     loading={isLoading}
                  />
                  <StatItem
                     title={t('dashboard.aurora.errors')}
                     hint={t('dashboard.aurora.errorsHint')}
                     value={formatCount(errorCount, locale)}
                     valueClassName={errorCount > 0 ? 'text-destructive' : undefined}
                     loading={isLoading}
                  />
               </div>
            )}
         </CardContent>
      </Card>
   );
};
