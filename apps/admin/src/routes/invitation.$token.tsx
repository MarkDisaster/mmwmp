import { createFileRoute } from '@tanstack/react-router';

import { AcceptInvitationPage } from '@/features/auth/components/AcceptInvitationPage';

export const Route = createFileRoute('/invitation/$token')({
   component: RouteComponent,
});

function RouteComponent() {
   const { token } = Route.useParams();
   return <AcceptInvitationPage token={token} />;
}
