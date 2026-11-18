import { createFileRoute, Outlet, stripSearchParams } from '@tanstack/react-router';

import { TagListPage } from '@/features/tags/components/TagListPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/tags')({
   beforeLoad: requireRoutePermission('/tags'),
   validateSearch: sortedListSearchSchema(['name', 'slug', 'sortOrder', 'createdAt', 'updatedAt']),
   search: { middlewares: [stripSearchParams(SORTED_LIST_SEARCH_DEFAULTS)] },
   component: TagsLayout,
});

function TagsLayout() {
   return (
      <>
         <TagListPage />
         <Outlet />
      </>
   );
}
