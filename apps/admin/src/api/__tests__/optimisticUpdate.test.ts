import { afterEach, describe, expect, it } from 'vitest';

import { optimisticUpdate } from '@/api/optimisticUpdate';
import { queryClient } from '@/utils/query-client';

type Item = { id: number; status: string };
type Variables = { id: number; status: string };

const keyOf = (id: number) => ['items', 'detail', id] as const;

const update = optimisticUpdate<Variables, Item>(
   ({ id }) => keyOf(id),
   (old, { status }) => ({ ...old, status }),
);

afterEach(() => {
   queryClient.clear();
});

describe('optimisticUpdate', () => {
   it('should patch the cached data before the request and restore it after a failure', async () => {
      queryClient.setQueryData(keyOf(1), { id: 1, status: 'published' });

      const snapshot = await update.onMutate({ id: 1, status: 'draft' });
      expect(queryClient.getQueryData(keyOf(1))).toEqual({ id: 1, status: 'draft' });

      update.onError(new Error('failed'), { id: 1, status: 'draft' }, snapshot);
      expect(queryClient.getQueryData(keyOf(1))).toEqual({ id: 1, status: 'published' });
   });

   it('should leave a query without data empty and other queries alone', async () => {
      queryClient.setQueryData(keyOf(2), { id: 2, status: 'published' });

      const snapshot = await update.onMutate({ id: 1, status: 'draft' });
      update.onError(new Error('failed'), { id: 1, status: 'draft' }, snapshot);

      expect(queryClient.getQueryData(keyOf(1))).toBeUndefined();
      expect(queryClient.getQueryData(keyOf(2))).toEqual({ id: 2, status: 'published' });
   });
});
