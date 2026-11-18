import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UIMessage } from 'ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { AiChatMessage } from '../AiChatMessage';

const findLock = vi.hoisted(() => vi.fn().mockResolvedValue({ heldBy: null, mine: false }));

vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { detail } = actual.api.editLocks.queries;
   return {
      ...actual,
      api: {
         ...actual.api,
         editLocks: {
            ...actual.api.editLocks,
            queries: {
               detail: (...args: Parameters<typeof detail>) => ({
                  ...detail(...args),
                  queryFn: () => findLock(...args),
               }),
            },
         },
      },
   };
});

window.matchMedia ??= (query: string) =>
   ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
   }) as MediaQueryList;

afterEach(() => {
   queryClient.clear();
});

const toolMessage = (part: Record<string, unknown>): UIMessage =>
   ({
      id: 'm1',
      role: 'assistant',
      parts: [{ type: 'tool-setRunnerScoreVisibility', toolCallId: 'c1', ...part }],
   }) as unknown as UIMessage;

describe('AiChatMessage tool parts', () => {
   it('should render the approval tile for a call waiting for approval and send the answer', async () => {
      const addToolApprovalResponse = vi.fn();
      render(
         <AiChatMessage
            message={toolMessage({
               state: 'approval-requested',
               approval: { id: 'ap1' },
               input: { id: 3, hidden: false },
            })}
            addToolApprovalResponse={addToolApprovalResponse}
            isFinalized
         />,
         { wrapper: QueryWrapper },
      );

      expect(screen.getByText('(id: 3; hidden: false)')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(addToolApprovalResponse).toHaveBeenCalledWith({ id: 'ap1', approved: true });
   });

   it('should render the one-line tile once the user cancelled the call', () => {
      render(
         <AiChatMessage
            message={toolMessage({
               state: 'output-denied',
               approval: { id: 'ap1', approved: false },
               input: { id: 3, hidden: false },
            })}
            addToolApprovalResponse={vi.fn()}
            isFinalized
         />,
         { wrapper: QueryWrapper },
      );

      expect(screen.getByText('(id: 3; hidden: false)')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
      expect(screen.getByText(/Cancel/)).toBeInTheDocument();
   });

   it('should name a failed call in the admin language when its stored part has no error text', () => {
      render(
         <AiChatMessage
            message={toolMessage({ state: 'output-error', input: { id: 3 } })}
            addToolApprovalResponse={vi.fn()}
            isFinalized
         />,
         { wrapper: QueryWrapper },
      );

      expect(screen.getByText('Aurora ran into an error.')).toBeInTheDocument();
   });
});

describe('AiChatMessage approval tile and the edit lock', () => {
   const renderUpdateProject = () =>
      render(
         <QueryWrapper>
            <AiChatMessage
               message={
                  {
                     id: 'm2',
                     role: 'assistant',
                     parts: [
                        {
                           type: 'tool-updateProject',
                           toolCallId: 'c2',
                           state: 'approval-requested',
                           approval: { id: 'ap2' },
                           input: { id: 4, company: 'Acme' },
                        },
                     ],
                  } as unknown as UIMessage
               }
               addToolApprovalResponse={vi.fn()}
               isFinalized
            />
         </QueryWrapper>,
      );

   beforeEach(() => {
      findLock.mockReset();
      signInAs(createUser(ADMIN_ROLE, { id: 10 }));
   });
   afterEach(() => queryClient.clear());

   it('should name the user who has the record open', async () => {
      findLock.mockResolvedValue({
         heldBy: { userId: 3, name: 'Jana Nováková', since: '2026-11-12T14:02:00.000Z' },
         mine: false,
      });
      renderUpdateProject();

      expect(
         await screen.findByText('Jana Nováková is editing this record right now.'),
      ).toBeInTheDocument();
      expect(findLock).toHaveBeenCalledWith('projects', 4);
   });

   it('should say nothing about a lock of the signed-in user or no lock', async () => {
      findLock.mockResolvedValue({
         heldBy: { userId: 10, name: 'Me', since: '2026-11-12T14:02:00.000Z' },
         mine: false,
      });
      renderUpdateProject();

      await vi.waitFor(() => expect(findLock).toHaveBeenCalled());
      await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
      expect(screen.queryByText(/is editing this record/)).not.toBeInTheDocument();
   });
});
