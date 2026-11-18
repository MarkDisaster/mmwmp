import { createFileRoute, stripSearchParams } from '@tanstack/react-router';

import { RoleListPage } from '@/features/roles/components/RoleListPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/roles/')({
   beforeLoad: requireRoutePermission('/roles'),
   validateSearch: sortedListSearchSchema(['name']),
   search: { middlewares: [stripSearchParams(SORTED_LIST_SEARCH_DEFAULTS)] },
   component: RoleListPage,
});
