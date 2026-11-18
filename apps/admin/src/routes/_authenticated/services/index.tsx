import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { serviceControllerFindAllQueryParamsStatusEnum } from '@/api/generated';
import { ServiceListPage } from '@/features/services/components/ServiceListPage';
import { SERVICE_SORT_FIELDS } from '@/features/services/constants';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/services/')({
   beforeLoad: requireRoutePermission('/services'),
   validateSearch: sortedListSearchSchema(SERVICE_SORT_FIELDS).extend({
      status: z.enum(serviceControllerFindAllQueryParamsStatusEnum).optional().catch(undefined),
   }),
   search: { middlewares: [stripSearchParams(SORTED_LIST_SEARCH_DEFAULTS)] },
   component: ServiceListPage,
});
