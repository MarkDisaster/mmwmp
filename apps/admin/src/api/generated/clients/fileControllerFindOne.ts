/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   FileControllerFindOneQueryResponse,
   FileControllerFindOnePathParams,
} from '../models/FileControllerFindOne';

function getFileControllerFindOneUrl(id: FileControllerFindOnePathParams['id']) {
   const res = { method: 'GET', url: `/files/${id}` as const };
   return res;
}

export async function fileControllerFindOne(
   id: FileControllerFindOnePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      FileControllerFindOneQueryResponse,
      ResponseErrorConfig<Error>,
      unknown
   >({ method: 'GET', url: getFileControllerFindOneUrl(id).url.toString(), ...requestConfig });
   return res;
}
