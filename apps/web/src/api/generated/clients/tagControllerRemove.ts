/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   TagControllerRemoveMutationResponse,
   TagControllerRemovePathParams,
   TagControllerRemove404,
} from '../models/TagControllerRemove';

function getTagControllerRemoveUrl(id: TagControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/tags/${id}` as const };
   return res;
}

export async function tagControllerRemove(
   id: TagControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagControllerRemoveMutationResponse,
      ResponseErrorConfig<TagControllerRemove404>,
      unknown
   >({ method: 'DELETE', url: getTagControllerRemoveUrl(id).url.toString(), ...requestConfig });
   return res;
}
