import { extFromMimeType } from '@/features/ai-chat/utils/speech';
import { apiFetch } from '@/utils/axios';

export const TRANSCRIBE_TIMEOUT_MS = 130_000;

export const transcribeRecording = async (blob: Blob, signal: AbortSignal) => {
   const form = new FormData();
   form.append('file', blob, `recording.${extFromMimeType(blob.type)}`);
   const response = await apiFetch('/ai/voice/transcribe', {
      method: 'POST',
      body: form,
      signal: AbortSignal.any([signal, AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS)]),
   });
   if (!response.ok) return null;
   const json = (await response.json()) as { text?: string };
   return json.text?.trim() ?? '';
};
