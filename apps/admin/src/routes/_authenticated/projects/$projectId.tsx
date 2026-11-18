import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { api } from '@/api';
import { EditorFormSkeleton } from '@/components/common/EditorFormSkeleton';
import { ProjectEditorForm } from '@/features/projects/components/ProjectEditorForm';
import { notFoundOn404, parseIdParam } from '@/utils/detailRoute';
import { queryClient } from '@/utils/query-client';
import { requireRoutePermission } from '@/utils/routePermissions';

function ProjectDetailPage() {
   const { projectId } = Route.useParams();
   const { data: project } = useSuspenseQuery(api.projects.queries.detail(projectId));

   return <ProjectEditorForm key={project.id} project={project} />;
}

export const Route = createFileRoute('/_authenticated/projects/$projectId')({
   beforeLoad: requireRoutePermission('/projects/$projectId'),
   params: {
      parse: ({ projectId }) => ({ projectId: parseIdParam(projectId) }),
      stringify: ({ projectId }) => ({ projectId: String(projectId) }),
   },
   loader: ({ params }) =>
      notFoundOn404(queryClient.ensureQueryData(api.projects.queries.detail(params.projectId))),
   pendingComponent: () => (
      <EditorFormSkeleton
         headerButtons={3}
         toolbar
         main={[
            ['input', 'textarea', 'editor', 'media'],
            ['input', 'responsivePair'],
         ]}
         sidebar={[
            ['thumbnail', 'input', 'checkbox'],
            ['input', 'input', 'pair', 'links'],
         ]}
         sidebarAction
      />
   ),
   component: ProjectDetailPage,
});
