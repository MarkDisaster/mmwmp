import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { api } from '@/api';
import { EditorFormSkeleton } from '@/components/common/EditorFormSkeleton';
import { ServiceEditorForm } from '@/features/services/components/ServiceEditorForm';
import { notFoundOn404, parseIdParam } from '@/utils/detailRoute';
import { queryClient } from '@/utils/query-client';
import { requireRoutePermission } from '@/utils/routePermissions';

function ServiceDetailPage() {
   const { serviceId } = Route.useParams();
   const { data: service } = useSuspenseQuery(api.services.queries.detail(serviceId));

   return <ServiceEditorForm key={service.id} service={service} />;
}

export const Route = createFileRoute('/_authenticated/services/$serviceId')({
   beforeLoad: requireRoutePermission('/services/$serviceId'),
   params: {
      parse: ({ serviceId }) => ({ serviceId: parseIdParam(serviceId) }),
      stringify: ({ serviceId }) => ({ serviceId: String(serviceId) }),
   },
   loader: ({ params }) =>
      notFoundOn404(queryClient.ensureQueryData(api.services.queries.detail(params.serviceId))),
   pendingComponent: () => (
      <EditorFormSkeleton
         headerButtons={2}
         toolbar
         main={[['input', 'textarea', 'editor'], ['input']]}
         sidebar={[['input', 'checkbox']]}
         sidebarAction
      />
   ),
   component: ServiceDetailPage,
});
