import { createFileRoute } from '@tanstack/react-router';

import { ServiceEditorForm } from '@/features/services/components/ServiceEditorForm';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/services/new')({
   beforeLoad: requireRoutePermission('/services/new'),
   component: ServiceEditorForm,
});
