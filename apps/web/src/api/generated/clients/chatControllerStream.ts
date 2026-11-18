/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ChatControllerStreamMutationRequest,
   ChatControllerStreamMutationResponse,
   ChatControllerStreamPathParams,
   ChatControllerStream429,
} from '../models/ChatControllerStream';

function getChatControllerStreamUrl(id: ChatControllerStreamPathParams['id']) {
   const res = { method: 'POST', url: `/chat/conversations/${id}/stream` as const };
   return res;
}

export async function chatControllerStream(
   id: ChatControllerStreamPathParams['id'],
   data: ChatControllerStreamMutationRequest,
   config: Partial<RequestConfig<ChatControllerStreamMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      ChatControllerStreamMutationResponse,
      ResponseErrorConfig<ChatControllerStream429>,
      ChatControllerStreamMutationRequest
   >({
      method: 'POST',
      url: getChatControllerStreamUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
