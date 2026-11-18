import { mutationOptions, queryOptions } from '@tanstack/react-query';

import type { UpsertContactDto } from '@/api/generated';
import { contactControllerFind, contactControllerUpsert } from '@/api/generated';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';
import { isVersionConflict } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';

export const queryKeys = {
   detail: ['contact'] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   upsert: ['contact', 'upsert'] as const,
} satisfies MutationKeysObject;

export const contact = {
   queries: {
      detail: queryOptions({
         queryKey: queryKeys.detail,
         queryFn: () => contactControllerFind().then((r) => r.data),
      }),
   },
   mutations: {
      upsert: mutationOptions({
         mutationKey: mutationKeys.upsert,
         meta: { errorMessage: 'common.error', handlesVersionConflict: true },
         mutationFn: ({ data }: { data: UpsertContactDto }) =>
            contactControllerUpsert(data).then((r) => r.data),
         onSuccess: (saved) => queryClient.setQueryData(queryKeys.detail, saved),
         onSettled: (_saved, error) => {
            if (!isVersionConflict(error))
               void queryClient.invalidateQueries({ queryKey: queryKeys.detail });
         },
      }),
   },
} satisfies ApiDefinitionObject;
