import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import {
   getSpeakingOwner,
   speak,
   stopSpeech,
   subscribeToSpeech,
} from '@/features/ai-chat/utils/speechPlayback';

export type UseTextToSpeechReturn = {
   isPlaying: boolean;
   play: (text: string) => Promise<void>;
   stop: () => void;
};

export const useTextToSpeech = (ownerId: string): UseTextToSpeechReturn => {
   const speakingOwner = useSyncExternalStore(subscribeToSpeech, getSpeakingOwner, () => null);

   useEffect(() => () => stopSpeech(ownerId), [ownerId]);

   const play = useCallback((text: string) => speak(ownerId, text), [ownerId]);
   const stop = useCallback(() => stopSpeech(ownerId), [ownerId]);
   const isPlaying = speakingOwner === ownerId;

   return useMemo(() => ({ isPlaying, play, stop }), [isPlaying, play, stop]);
};
