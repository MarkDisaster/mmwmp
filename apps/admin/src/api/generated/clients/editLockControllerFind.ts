/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   EditLockControllerFindQueryResponse,
   EditLockControllerFindPathParams,
   EditLockControllerFindQueryParams,
   EditLockControllerFind403,
   EditLockControllerFind503,
} from '../models/EditLockControllerFind';

function getEditLockControllerFindUrl(
   entity: EditLockControllerFindPathParams['entity'],
   id: EditLockControllerFindPathParams['id'],
) {
   const res = { method: 'GET', url: `/edit-locks/${entity}/${id}` as const };
   return res;
}

export async function editLockControllerFind(
   entity: EditLockControllerFindPathParams['entity'],
   id: EditLockControllerFindPathParams['id'],
   params?: EditLockControllerFindQueryParams,
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      EditLockControllerFindQueryResponse,
      ResponseErrorConfig<EditLockControllerFind403 | EditLockControllerFind503>,
      unknown
   >({
      method: 'GET',
      url: getEditLockControllerFindUrl(entity, id).url.toString(),
      params,
      ...requestConfig,
   });
   return res;
}
