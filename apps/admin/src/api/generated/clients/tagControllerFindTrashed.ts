/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   TagControllerFindTrashedQueryResponse,
   TagControllerFindTrashedQueryParams,
} from '../models/TagControllerFindTrashed';

function getTagControllerFindTrashedUrl() {
   const res = { method: 'GET', url: `/tags/trash` as const };
   return res;
}

export async function tagControllerFindTrashed(
   params?: TagControllerFindTrashedQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagControllerFindTrashedQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({
      method: 'GET',
      url: getTagControllerFindTrashedUrl().url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
