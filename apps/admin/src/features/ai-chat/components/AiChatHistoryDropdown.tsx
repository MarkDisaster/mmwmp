import { cn } from '@mm/utils/cn';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { aiChat } from '@/api/endpoints/aiChat';
import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { formatRelativeDate } from '@/utils/date';

export const AiChatHistoryDropdown = () => {
   const { t, i18n } = useTranslation();
   const activeConversationId = useAiChatStore((s) => s.activeConversationId);
   const setActiveConversation = useAiChatStore((s) => s.setActiveConversation);
   const startNewConversation = useAiChatStore((s) => s.startNewConversation);
   const { data: conversations = [] } = useQuery(aiChat.queries.conversations());

   const active = conversations.find((c) => c.id === activeConversationId);
   const fallback = (id: string) => t('chat.conversationFallback', { prefix: id.slice(0, 8) });
   const label = activeConversationId
      ? (active?.title ?? fallback(activeConversationId))
      : t('chat.newConversation');

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full justify-between gap-1 px-2">
               <span className="truncate text-xs font-normal">{label}</span>
               <ChevronDown className="size-3 shrink-0" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-70">
            <DropdownMenuItem onClick={startNewConversation}>
               {t('chat.newConversationPlus')}
            </DropdownMenuItem>
            {conversations.length > 0 && (
               <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                     {t('chat.history')}
                  </DropdownMenuLabel>

                  <div className="max-h-80 overflow-y-auto">
                     {conversations.map((c) => (
                        <DropdownMenuItem
                           key={c.id}
                           onClick={() => setActiveConversation(c.id)}
                           className={cn(
                              'flex flex-col items-start gap-0.5',
                              c.id === activeConversationId && 'bg-accent',
                           )}
                        >
                           <span className="w-full truncate text-sm">
                              {c.title ?? fallback(c.id)}
                           </span>
                           <span className="text-xs text-muted-foreground">
                              {formatRelativeDate(c.updatedAt, i18n.language)}
                           </span>
                        </DropdownMenuItem>
                     ))}
                  </div>
               </>
            )}
         </DropdownMenuContent>
      </DropdownMenu>
   );
};
