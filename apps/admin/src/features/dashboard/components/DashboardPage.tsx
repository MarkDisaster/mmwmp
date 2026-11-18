import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { FolderOpen, LayoutDashboard, Plus, Tags, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { api } from '@/api';
import type { ProjectEntity } from '@/api/generated';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermission } from '@/hooks/usePermission';
import { formatDate } from '@/utils/date';

import { AuroraStatsSection } from './AuroraStatsSection';
import { DashboardSkeleton } from './DashboardSkeleton';
import { GameStatsSection } from './GameStatsSection';
import { StatItem } from './StatItem';

const getProjectTitle = (project: ProjectEntity, locale: string): string => {
   const translation =
      project.translations.find((tr) => tr.language === locale) ?? project.translations[0];
   return translation?.title ?? '—';
};

export const DashboardPage = () => {
   const { t, i18n } = useTranslation();
   const navigate = useNavigate();

   const canReadProjects = usePermission('projects', 'read');
   const canCreateProjects = usePermission('projects', 'create');
   const canReadUsers = usePermission('users', 'read');
   const canReadTags = usePermission('tags', 'read');
   const canCreateTags = usePermission('tags', 'create');

   const projectsQuery = useQuery({
      ...api.projects.queries.all({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
      enabled: canReadProjects,
   });
   const usersQuery = useQuery({ ...api.users.queries.all({ limit: 1 }), enabled: canReadUsers });
   const tagsQuery = useQuery({ ...api.tags.queries.all({ limit: 1 }), enabled: canReadTags });
   const projectsData = projectsQuery.data;

   const isLoading = projectsQuery.isLoading || usersQuery.isLoading || tagsQuery.isLoading;
   const loadError = t('common.loadError');

   const recentProjects = projectsData?.data ?? [];

   const columns: ColumnDef<ProjectEntity>[] = [
      {
         accessorKey: 'title',
         header: t('dashboard.recentProjects.table.name'),
         cell: ({ row }) => (
            <span className="font-medium">{getProjectTitle(row.original, i18n.language)}</span>
         ),
      },
      {
         accessorKey: 'status',
         header: t('dashboard.recentProjects.table.status'),
         cell: ({ row }) => (
            <StatusBadge
               status={row.original.status}
               label={t(`projects.status.${row.original.status}`)}
            />
         ),
      },
      {
         accessorKey: 'createdAt',
         header: t('dashboard.recentProjects.table.createdAt'),
         cell: ({ row }) => formatDate(row.original.createdAt, i18n.language),
      },
   ];

   const table = useReactTable({
      data: recentProjects,
      columns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
   });

   if (isLoading) return <DashboardSkeleton />;

   return (
      <div className="space-y-6">
         <PageHeader
            title={t('dashboard.title')}
            actions={
               <div className="flex gap-2">
                  {canCreateProjects && (
                     <Button asChild variant="outline">
                        <Link to="/projects/create">
                           <Plus className="mr-2 h-4 w-4" />
                           {t('dashboard.quickActions.newProject')}
                        </Link>
                     </Button>
                  )}
                  {canCreateTags && (
                     <Button asChild variant="outline">
                        <Link to="/tags/create">
                           <Plus className="mr-2 h-4 w-4" />
                           {t('dashboard.quickActions.newTag')}
                        </Link>
                     </Button>
                  )}
               </div>
            }
         />

         <div className="grid items-start gap-4 lg:grid-cols-2">
            {(canReadProjects || canReadUsers || canReadTags) && (
               <Card>
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2 text-lg">
                        <LayoutDashboard className="h-5 w-5" />
                        {t('dashboard.overview')}
                     </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="flex flex-wrap gap-x-8 gap-y-4">
                        {canReadProjects && (
                           <StatItem
                              title={t('dashboard.stats.projects')}
                              value={projectsData?.totalCount ?? 0}
                              error={projectsQuery.isLoadingError ? loadError : undefined}
                              href="/projects"
                              icon={<FolderOpen className="h-4 w-4" />}
                           />
                        )}
                        {canReadUsers && (
                           <StatItem
                              title={t('dashboard.stats.users')}
                              value={usersQuery.data?.totalCount ?? 0}
                              error={usersQuery.isLoadingError ? loadError : undefined}
                              href="/users"
                              icon={<Users className="h-4 w-4" />}
                           />
                        )}
                        {canReadTags && (
                           <StatItem
                              title={t('dashboard.stats.tags')}
                              value={tagsQuery.data?.totalCount ?? 0}
                              error={tagsQuery.isLoadingError ? loadError : undefined}
                              href="/tags"
                              icon={<Tags className="h-4 w-4" />}
                           />
                        )}
                     </div>
                  </CardContent>
               </Card>
            )}
            <AuroraStatsSection />
         </div>

         <GameStatsSection />

         {canReadProjects && (
            <div className="space-y-3">
               <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">{t('dashboard.recentProjects.title')}</h2>
               </div>
               {projectsQuery.isLoadingError ? (
                  <QueryErrorState
                     onRetry={() => void projectsQuery.refetch()}
                     isRetrying={projectsQuery.isFetching}
                  />
               ) : (
                  <DataTable
                     table={table}
                     onRowClick={(row) =>
                        navigate({
                           to: '/projects/$projectId',
                           params: { projectId: row.id },
                        })
                     }
                  />
               )}
            </div>
         )}
      </div>
   );
};
