import { renderHook } from '@testing-library/react';
import type { UIMessage } from 'ai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { queryKeys as projectsKeys } from '@/api/endpoints/projects';
import { queryClient } from '@/utils/query-client';

import { useInvalidateOnWriteToolResult } from '../useInvalidateOnWriteToolResult';

const DONE = 'output-available';

const message = (state: string): UIMessage =>
   ({
      id: 'm1',
      role: 'assistant',
      parts: [{ type: 'tool-updateProject', toolCallId: 'call-1', state, input: {}, output: {} }],
   }) as unknown as UIMessage;

describe('useInvalidateOnWriteToolResult', () => {
   afterEach(() => {
      vi.restoreAllMocks();
   });

   it('should invalidate when a write tool finishes in the middle of a turn', () => {
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
      const { rerender } = renderHook(({ messages }) => useInvalidateOnWriteToolResult(messages), {
         initialProps: { messages: [message('input-available')] },
      });
      expect(invalidate).not.toHaveBeenCalled();

      rerender({ messages: [message(DONE)] });
      expect(invalidate).toHaveBeenCalledTimes(3);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: projectsKeys.all });

      rerender({ messages: [message(DONE)] });
      expect(invalidate).toHaveBeenCalledTimes(3);
   });

   it('should skip the tool results that were in the history when the chat opened', () => {
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();

      renderHook(() => useInvalidateOnWriteToolResult([message(DONE)]));

      expect(invalidate).not.toHaveBeenCalled();
   });
});
