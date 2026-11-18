/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   TagControllerRemovePermanentlyMutationResponse,
   TagControllerRemovePermanentlyPathParams,
   TagControllerRemovePermanently404,
} from '../models/TagControllerRemovePermanently';

function getTagControllerRemovePermanentlyUrl(id: TagControllerRemovePermanentlyPathParams['id']) {
   const res = { method: 'DELETE', url: `/tags/${id}/permanent` as const };
   return res;
}

export async function tagControllerRemovePermanently(
   id: TagControllerRemovePermanentlyPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagControllerRemovePermanentlyMutationResponse,
      ResponseErrorConfig<TagControllerRemovePermanently404>,
      unknown
   >({
      method: 'DELETE',
      url: getTagControllerRemovePermanentlyUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
