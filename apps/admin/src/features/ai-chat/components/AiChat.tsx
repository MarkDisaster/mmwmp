import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { useResponsive } from '@/hooks/useResponsive';

import { AiChatFloating } from './AiChatFloating';
import { AiChatFullpage } from './AiChatFullpage';
import { AiChatLauncher } from './AiChatLauncher';
import { AiChatPanel } from './AiChatPanel';

export const AiChat = () => {
   const mode = useAiChatStore((s) => s.mode);
   const { isMobile } = useResponsive();

   if (mode === 'closed') {
      return <AiChatLauncher />;
   }

   if (isMobile) {
      return <AiChatFullpage />;
   }

   if (mode === 'fullpage') return <AiChatFullpage />;
   if (mode === 'floating') return <AiChatFloating />;
   return <AiChatPanel />;
};
