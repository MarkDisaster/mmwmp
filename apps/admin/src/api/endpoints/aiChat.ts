import { queryOptions } from '@tanstack/react-query';
import { DefaultChatTransport, type UIMessage } from 'ai';
import i18n from 'i18next';

import {
   chatControllerCreateConversation,
   chatControllerGetMessages,
   chatControllerListConversations,
} from '@/api/generated';
import type { ApiDefinitionObject, QueryKeysObject } from '@/api/types';
import type { Conversation } from '@/features/ai-chat/types/aiChat';
import { apiFetch } from '@/utils/axios';
import { getHttpStatusMessageKey } from '@/utils/httpError';

export const queryKeys = {
   conversations: () => ['chat', 'conversations'] as const,
   messages: (conversationId: string) =>
      ['chat', 'conversations', conversationId, 'messages'] as const,
} satisfies QueryKeysObject;

export const aiChat = {
   queries: {
      conversations: () =>
         queryOptions({
            queryKey: queryKeys.conversations(),
            queryFn: () =>
               chatControllerListConversations().then((r) => r.data as unknown as Conversation[]),
         }),
      messages: (conversationId: string) =>
         queryOptions({
            queryKey: queryKeys.messages(conversationId),
            queryFn: () =>
               chatControllerGetMessages(conversationId).then(
                  (r) => r.data as unknown as UIMessage[],
               ),
         }),
   },
} satisfies ApiDefinitionObject;

export const createConversation = (): Promise<Conversation> =>
   chatControllerCreateConversation().then((r) => r.data as unknown as Conversation);

const chatFetch: typeof fetch = async (input, init) => {
   const response = await apiFetch(input, init);
   const messageKey = response.ok ? undefined : getHttpStatusMessageKey(response.status);
   if (messageKey) throw new Error(i18n.t(messageKey));
   return response;
};

export const createAiChatTransport = (conversationId: string, getPagePath: () => string) =>
   new DefaultChatTransport({
      api: `/chat/conversations/${conversationId}/stream`,
      fetch: chatFetch,
      body: () => ({ pageContext: { path: getPagePath() } }),
   });
