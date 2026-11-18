import { MutationObserver } from '@tanstack/react-query';
import i18next from 'i18next';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMoveMutation } from '@/api/createMoveMutation';
import { queryClient } from '@/utils/query-client';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const LIST_KEY = ['items', 'list'] as const;
const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];

afterEach(() => {
   vi.clearAllMocks();
   queryClient.clear();
});

describe('createMoveMutation', () => {
   it('should restore the list and report a failed move with its own message', async () => {
      queryClient.setQueryData([...LIST_KEY, undefined], { data: rows, totalCount: 3 });
      const move = createMoveMutation<{ id: number }>({
         mutationKey: ['items', 'move'],
         listKey: LIST_KEY,
         detailKey: (id) => ['items', 'detail', id],
         request: () => Promise.reject(new Error('failed')),
         errorMessage: 'projects.toast.reorderFailed',
      });

      await new MutationObserver(queryClient, move)
         .mutate({ id: 1, data: { targetId: 3, position: 'after' } })
         .catch(() => {});

      expect(queryClient.getQueryData([...LIST_KEY, undefined])).toEqual({
         data: rows,
         totalCount: 3,
      });
      expect(toast.error).toHaveBeenCalledWith(
         i18next.t('projects.toast.reorderFailed'),
         expect.anything(),
      );
   });
});
