import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import i18next from 'i18next';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PUBLISHED_CONTENT_FORBIDDEN_MESSAGE } from '@/utils/httpError';
import { queryClient } from '@/utils/query-client';

import { useEntityEditorActions } from '../useEntityEditorActions';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const MESSAGES = {
   unpublished: 'projects.toast.unpublished',
   statusFailed: 'projects.toast.statusFailed',
   deleted: 'projects.toast.deleted',
   deleteFailed: 'projects.toast.deleteFailed',
};

const httpError = (status: number, data?: unknown) =>
   new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status,
      data,
   } as AxiosResponse);

const wrapper = ({ children }: { children: ReactNode }) => (
   <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const renderActions = (failure: unknown, leaveEditor: () => unknown = () => undefined) => {
   let rejectRequest: (error: unknown) => void = () => {};
   let resolveRequest: () => void = () => {};
   const pending = new Promise<never>((resolve, reject) => {
      rejectRequest = reject;
      resolveRequest = () => resolve(undefined as never);
   });
   const request = () => pending;
   const onDeleted = vi.fn(leaveEditor);
   const hook = renderHook(
      () =>
         useEntityEditorActions(
            { id: 5 },
            {
               updateStatus: { meta: { silent: true }, mutationFn: request },
               remove: { meta: { silent: true }, mutationFn: request },
               onDeleted,
               detailKey: (id) => ['items', 'detail', id],
               messages: MESSAGES,
            },
         ),
      { wrapper },
   );
   return { ...hook, fail: () => rejectRequest(failure), resolveRequest, onDeleted };
};

afterEach(() => {
   vi.clearAllMocks();
   queryClient.clear();
});

describe('useEntityEditorActions', () => {
   it('should report a failed delete also after the editor was left', async () => {
      const { result, unmount, fail, onDeleted } = renderActions(httpError(500));

      act(() => result.current.delete());
      unmount();
      fail();

      await waitFor(() =>
         expect(toast.error).toHaveBeenCalledWith(
            i18next.t(MESSAGES.deleteFailed),
            expect.anything(),
         ),
      );
      expect(onDeleted).not.toHaveBeenCalled();
   });

   it('should report a failed unpublish with the reason the API gave', async () => {
      const { result, fail } = renderActions(
         httpError(403, { message: PUBLISHED_CONTENT_FORBIDDEN_MESSAGE }),
      );

      act(() => result.current.unpublish());
      fail();

      await waitFor(() =>
         expect(toast.error).toHaveBeenCalledWith(
            i18next.t('common.httpError.publishedContentLocked'),
            expect.anything(),
         ),
      );
      expect(toast.error).toHaveBeenCalledTimes(1);
   });

   it('should remove the detail of the deleted record only after the editor was left', async () => {
      queryClient.setQueryData(['items', 'detail', 5], { id: 5 });
      queryClient.setQueryData(['items', 'detail', 6], { id: 6 });
      let leave: () => void = () => {};
      const left = new Promise<void>((resolve) => {
         leave = resolve;
      });
      const { result, resolveRequest, onDeleted } = renderActions(undefined, () => left);

      act(() => result.current.delete());
      resolveRequest();
      await waitFor(() => expect(onDeleted).toHaveBeenCalled());
      expect(queryClient.getQueryData(['items', 'detail', 5])).toEqual({ id: 5 });

      leave();
      await waitFor(() => expect(queryClient.getQueryData(['items', 'detail', 5])).toBeUndefined());
      expect(queryClient.getQueryData(['items', 'detail', 6])).toEqual({ id: 6 });
   });

   it('should keep the detail when leaving the editor failed', async () => {
      queryClient.setQueryData(['items', 'detail', 5], { id: 5 });
      const { result, resolveRequest, onDeleted } = renderActions(undefined, () =>
         Promise.reject(new Error('navigation failed')),
      );

      act(() => result.current.delete());
      resolveRequest();
      await waitFor(() => expect(onDeleted).toHaveBeenCalled());
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(queryClient.getQueryData(['items', 'detail', 5])).toEqual({ id: 5 });
   });
});
