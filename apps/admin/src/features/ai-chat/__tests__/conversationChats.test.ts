import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import type { ClientToolDeps } from '@/features/ai-chat/utils/clientTools';
import {
   clearConversationChats,
   getConversationChat,
   getOrCreateConversationChat,
   MAX_CONVERSATION_CHATS,
} from '@/features/ai-chat/utils/conversationChats';
import {
   AUTH_QUERY_KEY,
   endAuthSession,
   LATEST_SESSION_STORAGE_KEY,
   restoreLatestStoredSession,
} from '@/features/auth/auth-query';
import { queryClient } from '@/utils/query-client';

const deps = {} as ClientToolDeps;
const CONVERSATION_ID = 'conversation-1';

const conversationIdAt = (index: number) => `chat-${index}`;

const createChats = (count: number, offset = 0) =>
   Array.from({ length: count }, (_, index) =>
      getOrCreateConversationChat(conversationIdAt(offset + index), [], deps),
   );

beforeEach(() => {
   clearConversationChats();
});

describe('conversation chats on sign-out', () => {
   it('should stop and forget every chat and the active conversation when the session ends', () => {
      const chat = getOrCreateConversationChat(CONVERSATION_ID, [], deps);
      const stop = vi.spyOn(chat, 'stop');
      useAiChatStore.getState().setActiveConversation(CONVERSATION_ID);

      endAuthSession();

      expect(stop).toHaveBeenCalledTimes(1);
      expect(getConversationChat(CONVERSATION_ID)).toBeUndefined();
      expect(useAiChatStore.getState().activeConversationId).toBeNull();
   });
});

describe('conversation chats on a restore of another user', () => {
   afterEach(() => {
      vi.unstubAllGlobals();
   });

   it('should forget the active conversation when the stored session replaces the restored one', () => {
      const stored = {
         accessToken: `header.${btoa(JSON.stringify({ sub: 2 }))}.signature`,
         refreshToken: 'refresh',
         expiresAt: new Date(Date.now() + 60_000).toISOString(),
      };
      vi.stubGlobal('localStorage', {
         getItem: (key: string) =>
            key === LATEST_SESSION_STORAGE_KEY ? JSON.stringify(stored) : null,
         setItem: () => undefined,
         removeItem: () => undefined,
      });
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      useAiChatStore.getState().setActiveConversation(CONVERSATION_ID);

      restoreLatestStoredSession();

      expect(useAiChatStore.getState().activeConversationId).toBeNull();
   });
});

describe('conversation chats limit', () => {
   it('should forget the least recently used idle chat over the limit', () => {
      createChats(MAX_CONVERSATION_CHATS);
      getConversationChat(conversationIdAt(0));

      createChats(1, MAX_CONVERSATION_CHATS);

      expect(getConversationChat(conversationIdAt(0))).toBeDefined();
      expect(getConversationChat(conversationIdAt(1))).toBeUndefined();
   });

   it('should keep a chat whose answer is still streaming', () => {
      const [streaming] = createChats(MAX_CONVERSATION_CHATS);
      vi.spyOn(streaming, 'status', 'get').mockReturnValue('streaming');

      createChats(1, MAX_CONVERSATION_CHATS);

      expect(getConversationChat(conversationIdAt(0))).toBe(streaming);
      expect(getConversationChat(conversationIdAt(1))).toBeUndefined();
   });
});
