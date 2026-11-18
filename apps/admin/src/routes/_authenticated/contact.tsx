import { createFileRoute } from '@tanstack/react-router';

import { ContactPage } from '@/features/contact/components/ContactPage';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/contact')({
   beforeLoad: requireRoutePermission('/contact'),
   component: ContactPage,
});
