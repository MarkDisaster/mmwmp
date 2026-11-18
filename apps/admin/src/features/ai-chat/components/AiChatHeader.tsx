import { cn } from '@mm/utils/cn';
import { Maximize2, MessageSquarePlus, PanelRight, PictureInPicture2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import type { ChatMode } from '@/features/ai-chat/types/aiChat';
import { useResponsive } from '@/hooks/useResponsive';

import { AiChatHistoryDropdown } from './AiChatHistoryDropdown';

const MODE_BUTTONS: Array<{
   mode: Exclude<ChatMode, 'closed'>;
   icon: typeof Maximize2;
   labelKey: string;
}> = [
   { mode: 'fullpage', icon: Maximize2, labelKey: 'chat.modes.fullpage' },
   { mode: 'sidebar', icon: PanelRight, labelKey: 'chat.modes.sidebar' },
   { mode: 'floating', icon: PictureInPicture2, labelKey: 'chat.modes.floating' },
];

export const AiChatHeader = () => {
   const { t } = useTranslation();
   const mode = useAiChatStore((s) => s.mode);
   const setMode = useAiChatStore((s) => s.setMode);
   const close = useAiChatStore((s) => s.close);
   const startNewConversation = useAiChatStore((s) => s.startNewConversation);
   const { isMobile } = useResponsive();

   const newConversationLabel = t('chat.newConversation');
   const closeLabel = t('chat.close');

   return (
      <header className="flex flex-col items-start gap-1 border-b bg-background px-3 py-2">
         <div className="flex w-full justify-between gap-2">
            <div className="flex items-center gap-2">
               <h2 className="text-sm font-semibold">{t('chat.name')}</h2>
               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={startNewConversation}
                        aria-label={newConversationLabel}
                     >
                        <MessageSquarePlus className="size-4" />
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{newConversationLabel}</TooltipContent>
               </Tooltip>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
               {!isMobile &&
                  MODE_BUTTONS.map(({ mode: m, icon: Icon, labelKey }) => {
                     const label = t(labelKey);
                     return (
                        <Tooltip key={m}>
                           <TooltipTrigger asChild>
                              <Button
                                 size="icon"
                                 variant="ghost"
                                 className={cn('size-7', mode === m && 'bg-accent')}
                                 onClick={() => setMode(m)}
                                 aria-pressed={mode === m}
                                 aria-label={label}
                              >
                                 <Icon className="size-4" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent>{label}</TooltipContent>
                        </Tooltip>
                     );
                  })}

               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={close}
                        aria-label={closeLabel}
                     >
                        <X className="size-4" />
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{closeLabel}</TooltipContent>
               </Tooltip>
            </div>
         </div>
         <div className="w-full">
            <AiChatHistoryDropdown />
         </div>
      </header>
   );
};
