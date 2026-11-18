/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type { ChatControllerCreateConversationMutationResponse } from '../models/ChatControllerCreateConversation';

function getChatControllerCreateConversationUrl() {
   const res = { method: 'POST', url: `/chat/conversations` as const };
   return res;
}

export async function chatControllerCreateConversation(
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ChatControllerCreateConversationMutationResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'POST',
      url: getChatControllerCreateConversationUrl().url.toString(),
      ...requestConfig,
   });
   return res;
}
