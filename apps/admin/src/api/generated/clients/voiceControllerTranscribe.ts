/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   VoiceControllerTranscribeMutationRequest,
   VoiceControllerTranscribeMutationResponse,
   VoiceControllerTranscribe413,
} from '../models/VoiceControllerTranscribe';
import { buildFormData } from '../.kubb/config';

function getVoiceControllerTranscribeUrl() {
   const res = { method: 'POST', url: `/ai/voice/transcribe` as const };
   return res;
}

export async function voiceControllerTranscribe(
   data: VoiceControllerTranscribeMutationRequest,
   config: Partial<RequestConfig<VoiceControllerTranscribeMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;
   const formData = buildFormData(requestData);
   const res = await request<
      VoiceControllerTranscribeMutationResponse,
      ResponseErrorConfig<VoiceControllerTranscribe413>,
      VoiceControllerTranscribeMutationRequest
   >({
      method: 'POST',
      url: getVoiceControllerTranscribeUrl().url.toString(),
      data: formData as FormData,
      ...requestConfig,
   });
   return res;
}
