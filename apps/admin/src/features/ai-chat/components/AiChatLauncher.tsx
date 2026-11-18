import { MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';

export const AiChatLauncher = () => {
   const { t } = useTranslation();
   const reopen = useAiChatStore((s) => s.reopen);
   const label = t('chat.openChat');
   return (
      <Tooltip>
         <TooltipTrigger asChild>
            <Button
               onClick={reopen}
               size="icon"
               className="fixed right-6 bottom-8 z-30 size-12 rounded-full shadow-lg"
               aria-label={label}
            >
               <MessageSquare className="size-5" />
            </Button>
         </TooltipTrigger>
         <TooltipContent>{label}</TooltipContent>
      </Tooltip>
   );
};
