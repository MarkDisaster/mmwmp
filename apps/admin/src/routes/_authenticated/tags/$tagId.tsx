import { useQueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import { TagFormDialog } from '@/features/tags/components/TagFormDialog';
import { notFoundOn404, parseIdParam } from '@/utils/detailRoute';
import { queryClient } from '@/utils/query-client';

export const Route = createFileRoute('/_authenticated/tags/$tagId')({
   params: {
      parse: ({ tagId }) => ({ tagId: parseIdParam(tagId) }),
      stringify: ({ tagId }) => ({ tagId: String(tagId) }),
   },
   loader: ({ params }) =>
      notFoundOn404(queryClient.ensureQueryData(api.tags.queries.detail(params.tagId))),
   component: RouteComponent,
   notFoundComponent: () => <BackToList messageKey="tags.toast.notFound" />,
   errorComponent: () => <BackToList messageKey="tags.toast.loadFailed" />,
   pendingComponent: () => null,
});

function RouteComponent() {
   const { tagId } = Route.useParams();
   const navigate = useNavigate();
   const { data: tag } = useSuspenseQuery(api.tags.queries.detail(tagId));

   return (
      <TagFormDialog
         key={tag.id}
         open
         tag={tag}
         onClose={() => navigate({ to: '/tags', search: true })}
      />
   );
}

function BackToList({ messageKey }: { messageKey: string }) {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const queryErrorResetBoundary = useQueryErrorResetBoundary();

   useEffect(() => {
      queryErrorResetBoundary.reset();
      toast.error(t(messageKey), { id: messageKey });
      void navigate({ to: '/tags', replace: true, search: true });
   }, [messageKey, navigate, queryErrorResetBoundary, t]);

   return null;
}
