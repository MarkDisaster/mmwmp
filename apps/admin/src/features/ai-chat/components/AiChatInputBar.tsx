import { cn } from '@mm/utils/cn';
import type { TFunction } from 'i18next';
import {
   HeadphoneOff,
   Headphones,
   Loader2,
   Mic,
   MicOff,
   Paperclip,
   Pencil,
   PencilOff,
   Send,
} from 'lucide-react';
import type { ClipboardEvent, DragEvent } from 'react';
import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { FileEntity } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { useVoiceInput, type VoiceInputError } from '@/features/ai-chat/hooks/useVoiceInput';
import { buildUserMessageText } from '@/features/ai-chat/utils/controlTags';
import { onAuthSessionEnd } from '@/features/auth/auth-query';
import { useUploadFile } from '@/features/files/hooks/useUploadFile';
import {
   getFileError,
   getFileErrorMessage,
   getFileKind,
} from '@/features/files/utils/fileValidation';

import type { ChatAttachment } from '../types/aiChat';
import { AiChatAttachmentPreview } from './AiChatAttachmentPreview';
import type { AiChatInstance } from './AiChatConversation';

const VOICE_ERROR_KEYS: Record<VoiceInputError, string> = {
   microphoneUnavailable: 'chat.voice.errors.microphoneUnavailable',
   recognitionFailed: 'chat.voice.errors.recognitionFailed',
   transcriptionFailed: 'chat.voice.errors.transcriptionFailed',
   unsupported: 'chat.voice.errors.unsupported',
};

const TEXTAREA_MIN_HEIGHT_PX = 60;
const TEXTAREA_MAX_HEIGHT_PX = 180;

type Props = {
   chat: AiChatInstance;
};

type SubmitOptions = {
   text?: string;
   fromVoice?: boolean;
};

let clientIdCounter = 0;
const newClientId = () =>
   typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `att-${Date.now()}-${++clientIdCounter}`;

const getMicLabel = (t: TFunction, voice: { isRecording: boolean; isTranscribing: boolean }) => {
   if (voice.isRecording) return t('chat.voice.stopRecording');
   if (voice.isTranscribing) return t('chat.voice.transcribing');
   return t('chat.voice.startRecording');
};

const MicIcon = ({
   isRecording,
   isTranscribing,
}: {
   isRecording: boolean;
   isTranscribing: boolean;
}) => {
   if (isTranscribing) return <Loader2 className="size-4 animate-spin" />;
   if (isRecording) return <Mic className="size-4" />;
   return <MicOff className="size-4" />;
};

export const AiChatInputBar = ({ chat }: Props) => {
   const { t } = useTranslation();
   const { mutateAsync: uploadFile } = useUploadFile();
   const [value, setValue] = useState('');
   const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
   const [isDragOver, setIsDragOver] = useState(false);
   const [draftFromVoice, setDraftFromVoice] = useState(false);
   const voiceMode = useAiChatStore((s) => s.voiceMode);
   const autoEdit = useAiChatStore((s) => s.autoEdit);
   const setAutoEdit = useAiChatStore((s) => s.setAutoEdit);
   const setVoiceMode = useAiChatStore((s) => s.setVoiceMode);
   const isTtsSpeaking = useAiChatStore((s) => s.isTtsSpeaking);
   const [isUploading, setIsUploading] = useState(false);
   const textareaRef = useRef<HTMLTextAreaElement>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const uploadControllersRef = useRef(new Map<string, AbortController>());

   useEffect(() => {
      const controllers = uploadControllersRef.current;
      const abortUploads = () => controllers.forEach((controller) => controller.abort());
      const unsubscribe = onAuthSessionEnd(abortUploads);
      return () => {
         unsubscribe();
         abortUploads();
      };
   }, []);

   useLayoutEffect(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT_PX)}px`;
   }, [value]);

   const isStreaming = chat.status === 'submitted' || chat.status === 'streaming';
   const isBusy = isStreaming || isUploading;
   const failedUploads = attachments.filter((a) => a.uploadFailed);

   const voice = useVoiceInput({
      onInterim: (interim) => {
         setValue(interim);
         setDraftFromVoice(true);
      },
      onFinal: (finalText) => {
         setValue(finalText);
         setDraftFromVoice(true);
         if (voiceMode) void submit({ text: finalText, fromVoice: true });
      },
   });

   const shouldListen = voiceMode && !isBusy && !isTtsSpeaking;
   const syncMicrophone = useEffectEvent((listen: boolean) => {
      if (listen && !voice.isRecording && !voice.isTranscribing) void voice.start();
      if (!listen && voice.isRecording) voice.stop();
   });
   useEffect(() => {
      syncMicrophone(shouldListen);
   }, [shouldListen]);

   const addFiles = (files: FileList | File[]) => {
      const accepted = Array.from(files).filter((file) => {
         const error = getFileError(file);
         if (!error) return true;
         const { title, detail } = getFileErrorMessage(t, error, getFileKind());
         toast.error(`${file.name}: ${title}`, { description: detail });
         return false;
      });
      const next: ChatAttachment[] = accepted.map((file) => ({
         clientId: newClientId(),
         file,
         name: file.name,
         mimeType: file.type || 'application/octet-stream',
      }));
      setAttachments((prev) => [...prev, ...next]);
   };

   const removeAttachment = (clientId: string) => {
      uploadControllersRef.current.get(clientId)?.abort();
      setAttachments((prev) => prev.filter((a) => a.clientId !== clientId));
   };

   const uploadAttachment = async ({ clientId, file }: ChatAttachment) => {
      const controller = new AbortController();
      uploadControllersRef.current.set(clientId, controller);
      try {
         return await uploadFile({ file, signal: controller.signal });
      } finally {
         uploadControllersRef.current.delete(clientId);
      }
   };

   const uploadAttachments = async (pending: ChatAttachment[]): Promise<FileEntity[] | null> => {
      if (pending.length === 0) return [];
      setIsUploading(true);
      const results = await Promise.allSettled(
         pending.map((a) => a.uploaded ?? uploadAttachment(a)),
      );
      setIsUploading(false);

      const files = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      if (files.length === results.length) return files;

      const outcomes = new Map(pending.map((a, i) => [a.clientId, results[i]]));
      setAttachments((prev) =>
         prev.map((a) => {
            const outcome = outcomes.get(a.clientId);
            if (!outcome) return a;
            return outcome.status === 'fulfilled'
               ? { ...a, uploaded: outcome.value, uploadFailed: false }
               : { ...a, uploadFailed: true };
         }),
      );
      return null;
   };

   const submit = async ({ text = value, fromVoice = draftFromVoice }: SubmitOptions = {}) => {
      const trimmed = text.trim();
      if (isBusy) return;
      if (!trimmed && attachments.length === 0) return;
      if (voice.isRecording) voice.stop();

      const sending = attachments;
      const files = await uploadAttachments(sending);
      if (!files) return;

      const fileParts = files.map((f) => ({
         type: 'file' as const,
         filename: f.originalName,
         mediaType: f.mimeType,
         url: f.publicUrl,
      }));
      const textPart = {
         type: 'text' as const,
         text: buildUserMessageText({
            text: trimmed,
            files: files.map((f) => ({ fileId: f.id, name: f.originalName })),
            fromVoice,
            autoEdit,
         }),
      };

      setValue('');
      setDraftFromVoice(false);
      const sentIds = new Set(sending.map((a) => a.clientId));
      setAttachments((prev) => prev.filter((a) => !sentIds.has(a.clientId)));

      void chat.sendMessage({ parts: [...fileParts, textPart] });
   };

   const onDrop = (e: DragEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
   };

   const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const files = Array.from(e.clipboardData.files);
      if (files.length > 0) {
         e.preventDefault();
         addFiles(files);
      }
   };

   const canSend = (value.trim().length > 0 || attachments.length > 0) && !isBusy;
   const micLabel = getMicLabel(t, voice);
   const autoEditLabel = autoEdit ? t('chat.autoEdit.on') : t('chat.autoEdit.off');
   const voiceModeLabel = voiceMode ? t('chat.voice.modeOff') : t('chat.voice.modeOn');

   return (
      <form
         onSubmit={(e) => {
            e.preventDefault();
            void submit();
         }}
         onDragOver={(e) => {
            e.preventDefault();
            if (!isDragOver) setIsDragOver(true);
         }}
         onDragLeave={() => setIsDragOver(false)}
         onDrop={onDrop}
         className={cn('border-t bg-background px-3 pt-2 pb-4', isDragOver && 'bg-primary/5')}
      >
         {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
               {attachments.map((a) => (
                  <AiChatAttachmentPreview
                     key={a.clientId}
                     attachment={a}
                     onRemove={() => removeAttachment(a.clientId)}
                     disabled={isUploading}
                  />
               ))}
            </div>
         )}

         {failedUploads.length > 0 && (
            <div className="px-1 text-xs text-destructive" role="alert">
               {t('chat.attachment.uploadFailed', {
                  files: failedUploads.map((a) => a.name).join(', '),
               })}
            </div>
         )}

         {voice.error && (
            <div className="px-1 text-xs text-destructive" role="alert">
               {t(VOICE_ERROR_KEYS[voice.error])}
            </div>
         )}

         <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
               if (e.target.files && e.target.files.length > 0) {
                  addFiles(e.target.files);
                  e.target.value = '';
               }
            }}
         />

         <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <Textarea
               ref={textareaRef}
               value={value}
               onChange={(e) => {
                  setValue(e.target.value);
                  if (draftFromVoice) setDraftFromVoice(false);
               }}
               onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                     e.preventDefault();
                     void submit();
                  }
               }}
               onPaste={onPaste}
               placeholder={t('chat.input.placeholder')}
               rows={2}
               className="w-full resize-none rounded-none border-0 bg-transparent px-3 pt-3 text-sm shadow-none focus-visible:ring-0"
               style={{ minHeight: TEXTAREA_MIN_HEIGHT_PX, maxHeight: TEXTAREA_MAX_HEIGHT_PX }}
               readOnly={isUploading}
            />

            <div className="flex items-center gap-1 px-2 pb-2">
               <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-9 shrink-0"
                  disabled={isBusy}
                  aria-label={t('chat.attachment.add')}
                  onClick={() => fileInputRef.current?.click()}
               >
                  <Paperclip className="size-4" />
               </Button>

               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        type="button"
                        size="icon"
                        variant={voiceMode ? 'secondary' : 'ghost'}
                        className="size-9 shrink-0"
                        aria-label={voiceModeLabel}
                        aria-pressed={voiceMode}
                        onClick={() => setVoiceMode(!voiceMode)}
                     >
                        {voiceMode ? (
                           <Headphones className="size-4" />
                        ) : (
                           <HeadphoneOff className="size-4" />
                        )}
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{voiceModeLabel}</TooltipContent>
               </Tooltip>

               <Tooltip>
                  <TooltipTrigger asChild>
                     <Button
                        type="button"
                        size="icon"
                        variant={autoEdit ? 'secondary' : 'ghost'}
                        className="size-9 shrink-0"
                        aria-label={autoEditLabel}
                        aria-pressed={autoEdit}
                        onClick={() => setAutoEdit(!autoEdit)}
                     >
                        {autoEdit ? (
                           <Pencil className="size-4" />
                        ) : (
                           <PencilOff className="size-4" />
                        )}
                     </Button>
                  </TooltipTrigger>
                  <TooltipContent>{autoEditLabel}</TooltipContent>
               </Tooltip>

               <div className="flex-1" />

               {voice.isSupported && (
                  <Tooltip>
                     <TooltipTrigger asChild>
                        <Button
                           type="button"
                           size="icon"
                           variant="ghost"
                           className={cn(
                              'size-9 shrink-0',
                              voice.isRecording && 'animate-pulse text-destructive',
                           )}
                           disabled={isBusy || voice.isTranscribing}
                           aria-label={micLabel}
                           aria-pressed={voice.isRecording}
                           onClick={() => {
                              if (voice.isRecording) voice.stop();
                              else void voice.start();
                           }}
                        >
                           <MicIcon
                              isRecording={voice.isRecording}
                              isTranscribing={voice.isTranscribing}
                           />
                        </Button>
                     </TooltipTrigger>
                     <TooltipContent>{micLabel}</TooltipContent>
                  </Tooltip>
               )}

               <Button
                  type="submit"
                  size="icon"
                  className="size-9 shrink-0"
                  disabled={!canSend}
                  aria-label={t('chat.input.send')}
               >
                  {isBusy ? (
                     <Loader2 className="size-4 animate-spin" />
                  ) : (
                     <Send className="size-4" />
                  )}
               </Button>
            </div>
         </div>
      </form>
   );
};
