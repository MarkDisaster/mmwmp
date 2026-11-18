import { createFileRoute } from '@tanstack/react-router';

import { RoleEditorPage } from '@/features/roles/components/RoleEditorPage';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/roles/create')({
   beforeLoad: requireRoutePermission('/roles/create'),
   component: RoleEditorPage,
});
