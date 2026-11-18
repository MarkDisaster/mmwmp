import type { UIMessage } from 'ai';
import { useEffect, useRef } from 'react';

import { collectNewInvalidationKeys } from '@/features/ai-chat/utils/writeToolCacheInvalidation';
import { queryClient } from '@/utils/query-client';

export const useInvalidateOnWriteToolResult = (messages: readonly UIMessage[]) => {
   const seen = useRef<Set<string> | null>(null);

   useEffect(() => {
      if (seen.current === null) {
         seen.current = new Set();
         collectNewInvalidationKeys(messages, seen.current);
         return;
      }
      for (const queryKey of collectNewInvalidationKeys(messages, seen.current)) {
         void queryClient.invalidateQueries({ queryKey });
      }
   }, [messages]);
};
