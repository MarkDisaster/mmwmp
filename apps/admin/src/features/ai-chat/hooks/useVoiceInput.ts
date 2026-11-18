import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toSpeechLocale } from '@/features/ai-chat/utils/speech';
import { transcribeRecording } from '@/features/ai-chat/utils/transcribeRecording';

const VOICE_FINALIZE_DEBOUNCE_MS = 1500;

const RECORDER_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];

type SpeechRecognitionEvent = {
   results: SpeechRecognitionResultList;
   resultIndex: number;
};
type SpeechRecognitionErrorEvent = { error: string; message?: string };
type SpeechRecognitionInstance = {
   lang: string;
   continuous: boolean;
   interimResults: boolean;
   maxAlternatives: number;
   onresult: ((event: SpeechRecognitionEvent) => void) | null;
   onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
   onend: (() => void) | null;
   start: () => void;
   stop: () => void;
   abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

const getSpeechRecognitionCtor = (): SpeechRecognitionCtor | null => {
   if (typeof window === 'undefined') return null;
   const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
   };
   return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const MICROPHONE_ERROR_CODES = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);
const IGNORED_ERROR_CODES = new Set(['no-speech', 'aborted']);

export type VoiceInputError =
   | 'microphoneUnavailable'
   | 'recognitionFailed'
   | 'transcriptionFailed'
   | 'unsupported';

export type UseVoiceInputOptions = {
   onFinal: (transcript: string) => void;
   onInterim?: (transcript: string) => void;
};

export type UseVoiceInputReturn = {
   isRecording: boolean;
   isSupported: boolean;
   isTranscribing: boolean;
   error: VoiceInputError | null;
   start: () => Promise<void>;
   stop: () => void;
};

export const useVoiceInput = ({
   onFinal,
   onInterim,
}: UseVoiceInputOptions): UseVoiceInputReturn => {
   const [isRecording, setIsRecording] = useState(false);
   const [isTranscribing, setIsTranscribing] = useState(false);
   const [error, setError] = useState<VoiceInputError | null>(null);

   const recognizerRef = useRef<SpeechRecognitionInstance | null>(null);
   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
   const mediaStreamRef = useRef<MediaStream | null>(null);

   const onFinalRef = useRef(onFinal);
   const onInterimRef = useRef(onInterim);
   useEffect(() => {
      onFinalRef.current = onFinal;
      onInterimRef.current = onInterim;
   }, [onFinal, onInterim]);

   const lifecycleRef = useRef<AbortController | null>(null);

   const speechCtor = getSpeechRecognitionCtor();
   const supportsMediaRecorder =
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia;
   const isSupported = !!speechCtor || supportsMediaRecorder;

   const cleanupMediaStream = useCallback(() => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
   }, []);

   useEffect(() => {
      const lifecycle = new AbortController();
      lifecycleRef.current = lifecycle;
      return () => {
         lifecycle.abort();
         const recognizer = recognizerRef.current;
         recognizerRef.current = null;
         if (recognizer) {
            recognizer.onresult = null;
            recognizer.onerror = null;
            recognizer.onend = null;
            recognizer.abort();
         }
         const recorder = mediaRecorderRef.current;
         mediaRecorderRef.current = null;
         if (recorder) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            if (recorder.state !== 'inactive') recorder.stop();
         }
         cleanupMediaStream();
      };
   }, [cleanupMediaStream]);

   const startWebSpeech = useCallback(
      (Ctor: SpeechRecognitionCtor, signal: AbortSignal): boolean => {
         try {
            const r = new Ctor();
            r.lang = toSpeechLocale(i18n.language);
            r.continuous = true;
            r.interimResults = true;
            r.maxAlternatives = 1;

            let accumulatedFinal = '';
            let finalTimer: ReturnType<typeof setTimeout> | null = null;

            r.onresult = (event) => {
               let interim = '';
               let final = '';
               for (let i = event.resultIndex; i < event.results.length; i++) {
                  const res = event.results[i];
                  const transcript = res[0]?.transcript ?? '';
                  if (res.isFinal) final += transcript;
                  else interim += transcript;
               }
               if (interim) onInterimRef.current?.(interim);
               if (final) {
                  accumulatedFinal = (accumulatedFinal + ' ' + final).trim();
                  if (finalTimer) clearTimeout(finalTimer);
                  finalTimer = setTimeout(() => {
                     finalTimer = null;
                     const trimmed = accumulatedFinal.trim();
                     accumulatedFinal = '';
                     if (trimmed && !signal.aborted) onFinalRef.current(trimmed);
                  }, VOICE_FINALIZE_DEBOUNCE_MS);
               }
            };
            r.onerror = (event) => {
               if (IGNORED_ERROR_CODES.has(event.error)) return;
               setError(
                  MICROPHONE_ERROR_CODES.has(event.error)
                     ? 'microphoneUnavailable'
                     : 'recognitionFailed',
               );
            };
            r.onend = () => {
               if (finalTimer) {
                  clearTimeout(finalTimer);
                  finalTimer = null;
               }
               const trimmed = accumulatedFinal.trim();
               accumulatedFinal = '';
               if (trimmed) onFinalRef.current(trimmed);

               if (recognizerRef.current !== r) return;
               recognizerRef.current = null;
               setIsRecording(false);
            };
            r.start();
            recognizerRef.current = r;
            return true;
         } catch {
            return false;
         }
      },
      [],
   );

   const transcribe = useCallback(async (blob: Blob, signal: AbortSignal) => {
      setIsTranscribing(true);
      try {
         const text = await transcribeRecording(blob, signal);
         if (signal.aborted) return;
         if (text === null) setError('transcriptionFailed');
         else if (text) onFinalRef.current(text);
      } catch {
         if (!signal.aborted) setError('transcriptionFailed');
      } finally {
         if (!signal.aborted) setIsTranscribing(false);
      }
   }, []);

   const startMediaRecorder = useCallback(
      async (signal: AbortSignal): Promise<boolean> => {
         try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (signal.aborted) {
               stream.getTracks().forEach((t) => t.stop());
               return false;
            }
            mediaStreamRef.current = stream;
            const mimeType = RECORDER_MIME_TYPES.find((m) => MediaRecorder.isTypeSupported(m));
            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
               if (e.data.size > 0) chunks.push(e.data);
            };
            recorder.onstop = () => {
               if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
               stream.getTracks().forEach((t) => t.stop());
               if (mediaStreamRef.current === stream) mediaStreamRef.current = null;
               const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
               if (blob.size === 0) return;
               void transcribe(blob, signal);
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            return true;
         } catch {
            if (!signal.aborted) setError('microphoneUnavailable');
            cleanupMediaStream();
            return false;
         }
      },
      [cleanupMediaStream, transcribe],
   );

   const start = useCallback(async () => {
      if (isRecording) return;
      const signal = lifecycleRef.current?.signal;
      if (!signal || signal.aborted) return;
      if (!isSupported) {
         setError('unsupported');
         return;
      }
      setError(null);
      setIsRecording(true);

      if (speechCtor && startWebSpeech(speechCtor, signal)) return;
      if (!supportsMediaRecorder) setError('recognitionFailed');
      else if (await startMediaRecorder(signal)) return;

      if (!signal.aborted) setIsRecording(false);
   }, [
      isRecording,
      isSupported,
      speechCtor,
      startWebSpeech,
      supportsMediaRecorder,
      startMediaRecorder,
   ]);

   const stop = useCallback(() => {
      recognizerRef.current?.stop();
      if (mediaRecorderRef.current?.state === 'recording') {
         mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
   }, []);

   return useMemo(
      () => ({ isRecording, isSupported, isTranscribing, error, start, stop }),
      [isRecording, isSupported, isTranscribing, error, start, stop],
   );
};
