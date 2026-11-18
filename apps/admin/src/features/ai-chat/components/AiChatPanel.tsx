import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createConversation, queryKeys as aiChatKeys } from '@/api/endpoints/aiChat';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { queryClient } from '@/utils/query-client';
import { createSingleFlight } from '@/utils/singleFlight';

import { AiChatConversation } from './AiChatConversation';
import { AiChatHeader } from './AiChatHeader';
import { AiChatLoadingDots } from './AiChatLoadingDots';

const createActiveConversation = createSingleFlight(async () => {
   const conversation = await createConversation();
   const { activeConversationId, setActiveConversation } = useAiChatStore.getState();
   if (activeConversationId === null) {
      setActiveConversation(conversation.id);
   }
   void queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(), exact: true });
});

export const AiChatPanel = () => {
   const activeConversationId = useAiChatStore((s) => s.activeConversationId);
   const { t } = useTranslation();
   const [createFailed, setCreateFailed] = useState(false);
   const [retryNonce, setRetryNonce] = useState(0);

   useEffect(() => {
      if (activeConversationId) return;
      let cancelled = false;
      setCreateFailed(false);
      createActiveConversation().catch(() => {
         if (cancelled) return;
         setCreateFailed(true);
      });
      return () => {
         cancelled = true;
      };
   }, [activeConversationId, retryNonce]);

   if (!activeConversationId) {
      if (createFailed) {
         return (
            <div className="flex h-full flex-col bg-background">
               <AiChatHeader />
               <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                  <p>{t('chat.list.createError')}</p>
                  <button
                     type="button"
                     onClick={() => setRetryNonce((n) => n + 1)}
                     className="text-xs text-primary hover:underline"
                  >
                     {t('chat.list.retry')}
                  </button>
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
   }

   return <AiChatConversation key={activeConversationId} conversationId={activeConversationId} />;
};
