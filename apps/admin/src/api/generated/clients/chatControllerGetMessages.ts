/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ChatControllerGetMessagesQueryResponse,
   ChatControllerGetMessagesPathParams,
} from '../models/ChatControllerGetMessages';

function getChatControllerGetMessagesUrl(id: ChatControllerGetMessagesPathParams['id']) {
   const res = { method: 'GET', url: `/chat/conversations/${id}/messages` as const };
   return res;
}

export async function chatControllerGetMessages(
   id: ChatControllerGetMessagesPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ChatControllerGetMessagesQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'GET', url: getChatControllerGetMessagesUrl(id).url.toString(), ...requestConfig });
   return res;
}
