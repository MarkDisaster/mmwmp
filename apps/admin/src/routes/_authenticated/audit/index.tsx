import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { AuditLogListPage } from '@/features/audit/components/AuditLogListPage';
import { ACTOR_TYPES, RESOURCE_TYPES } from '@/features/audit/constants';
import { PAGINATED_SEARCH_DEFAULTS, paginatedSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/audit/')({
   beforeLoad: requireRoutePermission('/audit'),
   validateSearch: paginatedSearchSchema.extend({
      action: z.string().default('').catch(''),
      resourceType: z.enum(RESOURCE_TYPES).optional().catch(undefined),
      actorType: z.enum(ACTOR_TYPES).optional().catch(undefined),
      from: z.iso.date().optional().catch(undefined),
      to: z.iso.date().optional().catch(undefined),
   }),
   search: { middlewares: [stripSearchParams({ ...PAGINATED_SEARCH_DEFAULTS, action: '' })] },
   component: AuditLogListPage,
});
