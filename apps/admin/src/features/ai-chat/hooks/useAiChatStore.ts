import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { ChatMode } from '@/features/ai-chat/types/aiChat';
import {
   clearConversationChats,
   getConversationChat,
} from '@/features/ai-chat/utils/conversationChats';
import { onAuthSessionEnd } from '@/features/auth/auth-query';

type ChatStore = {
   mode: ChatMode;
   lastOpenMode: Exclude<ChatMode, 'closed'>;
   floatingPosition: { x: number; y: number } | null;
   activeConversationId: string | null;
   voiceMode: boolean;
   autoEdit: boolean;
   isTtsSpeaking: boolean;

   setMode: (mode: ChatMode) => void;
   revealPage: (isMobile: boolean) => void;
   close: () => void;
   reopen: () => void;
   setFloatingPosition: (pos: { x: number; y: number }) => void;
   setActiveConversation: (id: string | null) => void;
   startNewConversation: () => void;
   setVoiceMode: (enabled: boolean) => void;
   setAutoEdit: (v: boolean) => void;
   setIsTtsSpeaking: (v: boolean) => void;
};

export const useAiChatStore = create<ChatStore>()(
   persist(
      (set) => ({
         mode: 'closed',
         lastOpenMode: 'sidebar',
         floatingPosition: null,
         activeConversationId: null,
         voiceMode: false,
         autoEdit: false,
         isTtsSpeaking: false,

         setMode: (mode) =>
            set((s) => ({
               mode,
               lastOpenMode: mode === 'closed' ? s.lastOpenMode : mode,
            })),
         revealPage: (isMobile) =>
            set((s) => {
               if (s.mode === 'closed') return s;
               if (isMobile) return { mode: 'closed' };
               return s.mode === 'fullpage' ? { mode: 'sidebar', lastOpenMode: 'sidebar' } : s;
            }),
         close: () => set({ mode: 'closed' }),
         reopen: () => set((s) => ({ mode: s.lastOpenMode })),
         setFloatingPosition: (pos) => set({ floatingPosition: pos }),
         setActiveConversation: (id) => set({ activeConversationId: id }),
         startNewConversation: () =>
            set((s) => {
               const isUntouched =
                  s.activeConversationId !== null &&
                  getConversationChat(s.activeConversationId)?.messages.length === 0;
               return isUntouched ? s : { activeConversationId: null };
            }),
         setVoiceMode: (enabled) => set({ voiceMode: enabled }),
         setAutoEdit: (v) => set({ autoEdit: v }),
         setIsTtsSpeaking: (v) => set({ isTtsSpeaking: v }),
      }),
      {
         name: 'mm-admin-chat',
         partialize: (s) => ({
            mode: s.mode,
            lastOpenMode: s.lastOpenMode,
            floatingPosition: s.floatingPosition,
            activeConversationId: s.activeConversationId,
            voiceMode: s.voiceMode,
            autoEdit: s.autoEdit,
         }),
      },
   ),
);

onAuthSessionEnd(() => {
   clearConversationChats();
   useAiChatStore.setState({ activeConversationId: null });
});
