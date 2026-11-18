import { mutationOptions } from '@tanstack/react-query';

import type { MoveItemDto } from '@/api/generated';
import { queryClient } from '@/utils/query-client';
import { isSavedOrderList, moveRow } from '@/utils/reorder';

type MoveMutationConfig = {
   mutationKey: readonly unknown[];
   listKey: readonly unknown[];
   detailKey: (id: number) => readonly unknown[];
   request: (id: number, data: MoveItemDto) => Promise<unknown>;
   errorMessage: string;
};

export const createMoveMutation = <TItem extends { id: number }>({
   mutationKey,
   listKey,
   detailKey,
   request,
   errorMessage,
}: MoveMutationConfig) =>
   mutationOptions({
      mutationKey,
      meta: { errorMessage },
      mutationFn: ({ id, data }: { id: number; data: MoveItemDto }) => request(id, data),
      onMutate: async ({ id, data }) => {
         const filters = { queryKey: listKey, predicate: isSavedOrderList };
         await queryClient.cancelQueries(filters);
         const previous = queryClient.getQueriesData(filters);
         queryClient.setQueriesData<{ data: TItem[] }>(filters, (old) =>
            old && Array.isArray(old.data)
               ? { ...old, data: moveRow(old.data, { id, ...data }) }
               : old,
         );
         return { previous };
      },
      onError: (_err, _vars, context) => {
         context?.previous.forEach(([key, value]) => queryClient.setQueryData(key, value));
      },
      onSettled: (_data, _error, { id }) => {
         void queryClient.invalidateQueries({ queryKey: listKey });
         void queryClient.invalidateQueries({ queryKey: detailKey(id) });
      },
   });
