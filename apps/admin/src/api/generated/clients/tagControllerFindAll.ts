/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   TagControllerFindAllQueryResponse,
   TagControllerFindAllQueryParams,
} from '../models/TagControllerFindAll';

function getTagControllerFindAllUrl() {
   const res = { method: 'GET', url: `/tags` as const };
   return res;
}

export async function tagControllerFindAll(
   params?: TagControllerFindAllQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      TagControllerFindAllQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'GET', url: getTagControllerFindAllUrl().url.toString(), params, ...requestConfig });
   return res;
}
