import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { projectControllerFindAllQueryParamsStatusEnum } from '@/api/generated';
import { ProjectListPage } from '@/features/projects/components/ProjectListPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/projects/')({
   beforeLoad: requireRoutePermission('/projects'),
   validateSearch: sortedListSearchSchema([
      'title',
      'status',
      'createdBy',
      'sortOrder',
      'createdAt',
      'updatedAt',
   ]).extend({
      status: z.enum(projectControllerFindAllQueryParamsStatusEnum).optional().catch(undefined),
   }),
   search: { middlewares: [stripSearchParams(SORTED_LIST_SEARCH_DEFAULTS)] },
   component: ProjectListPage,
});
