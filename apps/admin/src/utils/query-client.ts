import { MutationCache, QueryClient } from '@tanstack/react-query';
import { isCancel } from 'axios';
import i18n from 'i18next';
import { toast } from 'sonner';

import { getHttpErrorMessageKey, isClientError, isVersionConflict } from '@/utils/httpError';

type AppMutationMeta = {
   silent?: boolean;
   errorMessage?: string;
   handlesVersionConflict?: boolean;
};

declare module '@tanstack/react-query' {
   interface Register {
      mutationMeta: AppMutationMeta;
   }
}

const MAX_QUERY_RETRIES = 1;

const MUTATION_ERROR_TOAST_ID = 'mutation-error';

export const queryClient = new QueryClient({
   mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
         if (mutation.meta?.silent || isCancel(error)) return;
         if (mutation.meta?.handlesVersionConflict && isVersionConflict(error)) return;
         const messageKey =
            getHttpErrorMessageKey(error) ?? mutation.meta?.errorMessage ?? 'common.mutationError';
         toast.error(i18n.t(messageKey), { id: MUTATION_ERROR_TOAST_ID });
      },
   }),
   defaultOptions: {
      queries: {
         refetchOnWindowFocus: true,
         staleTime: 30_000,
         gcTime: 300_000,
         retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_QUERY_RETRIES,
      },
   },
});
