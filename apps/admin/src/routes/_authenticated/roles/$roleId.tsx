import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { api } from '@/api';
import { EditorFormSkeleton } from '@/components/common/EditorFormSkeleton';
import { RoleEditorPage } from '@/features/roles/components/RoleEditorPage';
import { notFoundOn404, parseIdParam } from '@/utils/detailRoute';
import { queryClient } from '@/utils/query-client';
import { requireRoutePermission } from '@/utils/routePermissions';

function RoleDetailPage() {
   const { roleId } = Route.useParams();
   const { data: role } = useSuspenseQuery(api.roles.queries.detail(roleId));

   return <RoleEditorPage key={role.id} role={role} />;
}

export const Route = createFileRoute('/_authenticated/roles/$roleId')({
   beforeLoad: requireRoutePermission('/roles/$roleId'),
   params: {
      parse: ({ roleId }) => ({ roleId: parseIdParam(roleId) }),
      stringify: ({ roleId }) => ({ roleId: String(roleId) }),
   },
   loader: ({ params }) =>
      notFoundOn404(queryClient.ensureQueryData(api.roles.queries.detail(params.roleId))),
   pendingComponent: () => (
      <EditorFormSkeleton headerButtons={1} main={[['narrowInput'], ['permissions']]} mainAction />
   ),
   component: RoleDetailPage,
});
