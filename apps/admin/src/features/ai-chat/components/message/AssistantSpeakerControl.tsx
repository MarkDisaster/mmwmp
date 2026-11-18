import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { useTextToSpeech } from '@/features/ai-chat/hooks/useTextToSpeech';

export const AssistantSpeakerControl = ({
   messageId,
   text,
   isFinalized,
}: {
   messageId: string;
   text: string;
   isFinalized: boolean;
}) => {
   const { t } = useTranslation();
   const voiceMode = useAiChatStore((s) => s.voiceMode);
   const { play, stop, isPlaying } = useTextToSpeech(messageId);
   const autoplayRef = useRef<'pending' | 'done'>(isFinalized ? 'done' : 'pending');

   useEffect(() => {
      if (!isFinalized || autoplayRef.current === 'done') return;
      autoplayRef.current = 'done';
      if (voiceMode) void play(text);
   }, [isFinalized, voiceMode, text, play]);

   const label = isPlaying ? t('chat.voice.stopPlayback') : t('chat.voice.playAloud');

   return (
      <Tooltip>
         <TooltipTrigger asChild>
            <Button
               type="button"
               size="sm"
               variant="ghost"
               className="-mb-1 h-6 w-fit self-start px-1 text-[11px] text-muted-foreground hover:text-foreground"
               aria-label={label}
               aria-pressed={isPlaying}
               onClick={() => {
                  if (isPlaying) stop();
                  else void play(text);
               }}
            >
               {isPlaying ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
            </Button>
         </TooltipTrigger>
         <TooltipContent>{label}</TooltipContent>
      </Tooltip>
   );
};
