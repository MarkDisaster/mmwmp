/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   TagControllerFindOneQueryResponse,
   TagControllerFindOnePathParams,
   TagControllerFindOne404,
} from '../models/TagControllerFindOne';

function getTagControllerFindOneUrl(id: TagControllerFindOnePathParams['id']) {
   const res = { method: 'GET', url: `/tags/${id}` as const };
   return res;
}

export async function tagControllerFindOne(
   id: TagControllerFindOnePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagControllerFindOneQueryResponse,
      ResponseErrorConfig<TagControllerFindOne404>,
      unknown
   >({ method: 'GET', url: getTagControllerFindOneUrl(id).url.toString(), ...requestConfig });
   return res;
}
