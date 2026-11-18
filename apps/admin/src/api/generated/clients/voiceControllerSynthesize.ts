/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   VoiceControllerSynthesizeMutationRequest,
   VoiceControllerSynthesizeMutationResponse,
} from '../models/VoiceControllerSynthesize';

function getVoiceControllerSynthesizeUrl() {
   const res = { method: 'POST', url: `/ai/voice/synthesize` as const };
   return res;
}

export async function voiceControllerSynthesize(
   data: VoiceControllerSynthesizeMutationRequest,
   config: Partial<RequestConfig<VoiceControllerSynthesizeMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      VoiceControllerSynthesizeMutationResponse,
      ResponseErrorConfig<Error>,
      VoiceControllerSynthesizeMutationRequest
   >({
      method: 'POST',
      url: getVoiceControllerSynthesizeUrl().url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
