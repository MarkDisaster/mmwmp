import { createFileRoute } from '@tanstack/react-router';

import { ProjectEditorForm } from '@/features/projects/components/ProjectEditorForm';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/projects/create')({
   beforeLoad: requireRoutePermission('/projects/create'),
   component: ProjectEditorForm,
});
