import { createFileRoute, Outlet, stripSearchParams } from '@tanstack/react-router';

import { FileListPage } from '@/features/files/components/FileListPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/files')({
   beforeLoad: requireRoutePermission('/files'),
   validateSearch: sortedListSearchSchema(['originalName', 'size', 'createdAt']),
   search: { middlewares: [stripSearchParams(SORTED_LIST_SEARCH_DEFAULTS)] },
   component: FilesLayout,
});

function FilesLayout() {
   return (
      <>
         <FileListPage />
         <Outlet />
      </>
   );
}
