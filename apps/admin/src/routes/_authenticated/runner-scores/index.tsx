import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { z } from 'zod/v4';

import { RunnerScoreListPage } from '@/features/runner-scores/components/RunnerScoreListPage';
import { SORTED_LIST_SEARCH_DEFAULTS, sortedListSearchSchema } from '@/utils/listSearch';
import { requireRoutePermission } from '@/utils/routePermissions';

const SORT_FIELDS = ['nick', 'score', 'seconds', 'createdAt'] as const;

const DEFAULT_SORT = { sort: 'createdAt', order: 'desc' } as const;

export const Route = createFileRoute('/_authenticated/runner-scores/')({
   beforeLoad: requireRoutePermission('/runner-scores'),
   validateSearch: sortedListSearchSchema(SORT_FIELDS).extend({
      sort: z.enum(SORT_FIELDS).default(DEFAULT_SORT.sort).catch(DEFAULT_SORT.sort),
      order: z.enum(['asc', 'desc']).default(DEFAULT_SORT.order).catch(DEFAULT_SORT.order),
   }),
   search: {
      middlewares: [stripSearchParams({ ...SORTED_LIST_SEARCH_DEFAULTS, ...DEFAULT_SORT })],
   },
   component: RunnerScoreListPage,
});
