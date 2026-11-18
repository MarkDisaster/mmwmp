import { Chat } from '@ai-sdk/react';
import {
   lastAssistantMessageIsCompleteWithApprovalResponses,
   lastAssistantMessageIsCompleteWithToolCalls,
   type UIMessage,
} from 'ai';

import { createAiChatTransport, queryKeys as aiChatKeys } from '@/api/endpoints/aiChat';
import {
   type ClientToolDeps,
   executeClientTool,
   isClientTool,
} from '@/features/ai-chat/utils/clientTools';
import { collectInvalidationKeys } from '@/features/ai-chat/utils/writeToolCacheInvalidation';
import { queryClient } from '@/utils/query-client';

const chats = new Map<string, Chat<UIMessage>>();

export const MAX_CONVERSATION_CHATS = 20;

const isIdle = (chat: Chat<UIMessage>) => chat.status === 'ready' || chat.status === 'error';

const markUsed = (conversationId: string, chat: Chat<UIMessage>) => {
   chats.delete(conversationId);
   chats.set(conversationId, chat);
};

const forgetIdleChatsOverLimit = (keptConversationId: string) => {
   for (const [conversationId, chat] of chats) {
      if (chats.size <= MAX_CONVERSATION_CHATS) return;
      if (conversationId !== keptConversationId && isIdle(chat)) chats.delete(conversationId);
   }
};

export const getConversationChat = (conversationId: string) => {
   const chat = chats.get(conversationId);
   if (chat) markUsed(conversationId, chat);
   return chat;
};

export const clearConversationChats = () => {
   chats.forEach((chat) => void chat.stop());
   chats.clear();
};

const createConversationChat = (
   conversationId: string,
   messages: UIMessage[],
   deps: ClientToolDeps,
) => {
   const chat = new Chat<UIMessage>({
      id: conversationId,
      messages,
      transport: createAiChatTransport(conversationId, () => deps.router.state.location.pathname),
      sendAutomaticallyWhen: (opts) =>
         lastAssistantMessageIsCompleteWithToolCalls(opts) ||
         lastAssistantMessageIsCompleteWithApprovalResponses(opts),
      onToolCall: async ({ toolCall }) => {
         if (toolCall.dynamic) return;
         if (!isClientTool(toolCall.toolName)) return;

         try {
            const output = await executeClientTool(toolCall.toolName, toolCall.input, deps);
            chat.addToolOutput({
               tool: toolCall.toolName,
               toolCallId: toolCall.toolCallId,
               output,
            });
         } catch (error) {
            chat.addToolOutput({
               tool: toolCall.toolName,
               toolCallId: toolCall.toolCallId,
               state: 'output-error',
               errorText: error instanceof Error ? error.message : 'Tool failed',
            });
         }
      },
      onFinish: ({ message }) => {
         void queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(), exact: true });

         for (const queryKey of collectInvalidationKeys(message)) {
            void queryClient.invalidateQueries({ queryKey });
         }
      },
   });
   return chat;
};

export const getOrCreateConversationChat = (
   conversationId: string,
   messages: UIMessage[],
   deps: ClientToolDeps,
) => {
   const existing = chats.get(conversationId);
   if (existing) return existing;

   const chat = createConversationChat(conversationId, messages, deps);
   chats.set(conversationId, chat);
   forgetIdleChatsOverLimit(conversationId);
   return chat;
};
