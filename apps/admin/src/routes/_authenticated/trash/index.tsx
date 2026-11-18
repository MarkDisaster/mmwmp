import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { TRASH_TYPES } from '@/api/endpoints/trash';
import { TrashPage } from '@/features/trash/components/TrashPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

const SORT_FIELDS = ['title', 'deletedAt'] as const;

const DEFAULT_SORT = { sort: 'deletedAt', order: 'desc' } as const;

export const Route = createFileRoute('/_authenticated/trash/')({
   beforeLoad: requireRoutePermission('/trash'),
   validateSearch: sortedListSearchSchema(SORT_FIELDS).extend({
      sort: z.enum(SORT_FIELDS).default(DEFAULT_SORT.sort).catch(DEFAULT_SORT.sort),
      order: z.enum(['asc', 'desc']).default(DEFAULT_SORT.order).catch(DEFAULT_SORT.order),
      tab: z.enum(TRASH_TYPES).optional().catch(undefined),
   }),
   search: {
      middlewares: [stripSearchParams({ ...SORTED_LIST_SEARCH_DEFAULTS, ...DEFAULT_SORT })],
   },
   component: TrashPage,
});
