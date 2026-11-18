import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { TagFormDialog } from '@/features/tags/components/TagFormDialog';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/tags/create')({
   beforeLoad: requireRoutePermission('/tags/create'),
   component: RouteComponent,
});

function RouteComponent() {
   const navigate = useNavigate();

   return <TagFormDialog open onClose={() => navigate({ to: '/tags', search: true })} />;
}
