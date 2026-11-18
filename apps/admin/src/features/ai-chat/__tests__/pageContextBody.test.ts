import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '@/utils/axios';

import type { ClientToolDeps } from '../utils/clientTools';
import { clearConversationChats, getOrCreateConversationChat } from '../utils/conversationChats';

vi.mock('@/utils/axios', async (importOriginal) => ({
   ...(await importOriginal<typeof import('@/utils/axios')>()),
   apiFetch: vi.fn(),
}));

const emptyStream = () =>
   new Response('data: [DONE]\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream', 'x-vercel-ai-ui-message-stream': 'v1' },
   });

const sentPageContexts = () =>
   vi
      .mocked(apiFetch)
      .mock.calls.map(
         ([, init]) =>
            (JSON.parse(String(init?.body)) as { pageContext: { path: string } }).pageContext,
      );

describe('page context of a chat request', () => {
   const router = { state: { location: { pathname: '/projects/12' } } };
   const deps = { router } as unknown as ClientToolDeps;

   beforeEach(() => {
      clearConversationChats();
      vi.mocked(apiFetch).mockImplementation(async () => emptyStream());
   });

   afterEach(() => {
      vi.mocked(apiFetch).mockReset();
   });

   it('should send the route open at the time of each send, not the one at creation', async () => {
      const chat = getOrCreateConversationChat('conversation-1', [], deps);

      await chat.sendMessage({ text: 'uprav tenhle projekt' });
      router.state.location.pathname = '/services/3';
      await chat.sendMessage({ text: 'a tuhle službu' });
      router.state.location.pathname = '/tags';
      await chat.sendMessage({ text: 'a tady?' });

      expect(sentPageContexts()).toEqual([
         { path: '/projects/12' },
         { path: '/services/3' },
         { path: '/tags' },
      ]);
   });
});
