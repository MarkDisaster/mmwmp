import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { userControllerFindAllQueryParamsStatusEnum } from '@/api/generated';
import { UserListPage } from '@/features/users/components/UserListPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/users/')({
   beforeLoad: requireRoutePermission('/users'),
   validateSearch: sortedListSearchSchema(['firstName', 'email', 'createdAt']).extend({
      status: z.enum(userControllerFindAllQueryParamsStatusEnum).optional().catch(undefined),
   }),
   search: { middlewares: [stripSearchParams(SORTED_LIST_SEARCH_DEFAULTS)] },
   component: UserListPage,
});
