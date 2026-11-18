import { Paperclip } from 'lucide-react';
import { useLayoutEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { AiChatInstance } from './AiChatConversation';
import { AiChatLoadingDots } from './AiChatLoadingDots';
import { AiChatMessage } from './AiChatMessage';

const NEAR_BOTTOM_PX = 120;

type Props = {
   chat: AiChatInstance;
};

export const AiChatMessageList = ({ chat }: Props) => {
   const { t } = useTranslation();

   const scrollRef = useRef<HTMLDivElement>(null);
   const wasNearBottomRef = useRef(true);

   const onScroll = () => {
      const el = scrollRef.current;
      if (!el) return;
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      wasNearBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
   };

   useLayoutEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      if (wasNearBottomRef.current) {
         el.scrollTop = el.scrollHeight;
      }
   }, [chat.messages]);

   if (chat.messages.length === 0 && chat.status !== 'submitted' && chat.status !== 'streaming') {
      return (
         <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <p>{t('chat.list.emptyTitle')}</p>
            <p className="text-xs">
               <Trans
                  i18nKey="chat.list.emptyDescription"
                  components={{
                     attach: (
                        <Paperclip
                           role="img"
                           aria-label={t('chat.attachment.add')}
                           className="inline size-3.5 align-text-bottom"
                        />
                     ),
                  }}
               />
            </p>
         </div>
      );
   }

   const lastMessage = chat.messages[chat.messages.length - 1];
   const lastAssistantHasVisibleText =
      lastMessage?.role === 'assistant' &&
      (lastMessage.parts ?? []).some((p) => p.type === 'text' && p.text.length > 0);
   const isAwaitingAssistant =
      (chat.status === 'submitted' || chat.status === 'streaming') && !lastAssistantHasVisibleText;

   const isStreaming = chat.status === 'submitted' || chat.status === 'streaming';
   const lastMessageId = lastMessage?.id;

   return (
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto p-3">
         <div role="log" aria-busy={isStreaming} className="flex flex-col gap-3">
            {chat.messages.map((m) => (
               <AiChatMessage
                  key={m.id}
                  message={m}
                  addToolApprovalResponse={chat.addToolApprovalResponse}
                  isFinalized={!(isStreaming && m.id === lastMessageId)}
               />
            ))}
            {isAwaitingAssistant && (
               <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                  <AiChatLoadingDots />
                  {t('chat.list.thinking')}
               </div>
            )}
            {chat.error && (
               <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <p>{chat.error.message || t('chat.error.generic')}</p>
                  <button
                     type="button"
                     onClick={chat.clearError}
                     className="self-start text-[11px] text-destructive hover:underline"
                  >
                     {t('chat.error.dismiss')}
                  </button>
               </div>
            )}
         </div>
      </div>
   );
};
