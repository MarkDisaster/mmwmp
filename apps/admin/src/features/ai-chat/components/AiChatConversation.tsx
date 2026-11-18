import { type Chat, useChat } from '@ai-sdk/react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { UIMessage } from 'ai';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { aiChat } from '@/api/endpoints/aiChat';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { useInvalidateOnWriteToolResult } from '@/features/ai-chat/hooks/useInvalidateOnWriteToolResult';
import {
   getConversationChat,
   getOrCreateConversationChat,
} from '@/features/ai-chat/utils/conversationChats';
import { isMobileViewport } from '@/hooks/useResponsive';
import { getHttpStatus, isClientError } from '@/utils/httpError';
import { canCurrentUserAccessRoute } from '@/utils/routePermissions';

import { AiChatHeader } from './AiChatHeader';
import { AiChatInputBar } from './AiChatInputBar';
import { AiChatLoadingDots } from './AiChatLoadingDots';
import { AiChatMessageList } from './AiChatMessageList';

type Props = { conversationId: string };

export const AiChatConversation = ({ conversationId }: Props) => {
   const { t, i18n } = useTranslation();
   const router = useRouter();
   const setActiveConversation = useAiChatStore((s) => s.setActiveConversation);
   const setChatMode = useAiChatStore((s) => s.setMode);
   const revealPage = useAiChatStore((s) => s.revealPage);
   const liveChat = getConversationChat(conversationId);

   const { data: history, error: historyError } = useQuery({
      ...aiChat.queries.messages(conversationId),
      enabled: !liveChat,
      staleTime: Infinity,
      retry: (failureCount, error) => !isClientError(error) && failureCount < 1,
   });
   const isNotFound = getHttpStatus(historyError) === 404;

   useEffect(() => {
      if (isNotFound) {
         setActiveConversation(null);
      }
   }, [isNotFound, setActiveConversation]);

   if (liveChat) {
      return <AiChatConversationHost chat={liveChat} />;
   }

   if (history) {
      const deps = {
         i18n,
         router,
         setChatMode,
         revealPage: () => revealPage(isMobileViewport()),
         canOpen: canCurrentUserAccessRoute,
      };
      return (
         <AiChatConversationHost
            chat={getOrCreateConversationChat(conversationId, history, deps)}
         />
      );
   }

   if (historyError && !isNotFound) {
      return (
         <div className="flex h-full flex-col bg-background">
            <AiChatHeader />
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
               {t('chat.list.loadError')}
            </div>
         </div>
      );
   }

   return (
      <div className="flex h-full flex-col bg-background">
         <AiChatHeader />
         <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <AiChatLoadingDots />
            {t('chat.list.loading')}
         </div>
      </div>
   );
};

type HostProps = { chat: Chat<UIMessage> };

const AiChatConversationHost = ({ chat: conversationChat }: HostProps) => {
   const chat = useChat({ chat: conversationChat });
   useInvalidateOnWriteToolResult(chat.messages);

   return (
      <div className="flex h-full flex-col bg-background">
         <AiChatHeader />
         <AiChatMessageList chat={chat} />
         <AiChatInputBar chat={chat} />
      </div>
   );
};

export type AiChatInstance = ReturnType<typeof useChat>;
