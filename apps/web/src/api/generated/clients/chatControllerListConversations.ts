/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ChatControllerListConversationsQueryResponse,
   ChatControllerListConversationsQueryParams,
} from '../models/ChatControllerListConversations';

function getChatControllerListConversationsUrl() {
   const res = { method: 'GET', url: `/chat/conversations` as const };
   return res;
}

export async function chatControllerListConversations(
   params?: ChatControllerListConversationsQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ChatControllerListConversationsQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getChatControllerListConversationsUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
