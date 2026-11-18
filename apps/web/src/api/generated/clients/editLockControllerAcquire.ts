/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   EditLockControllerAcquireMutationRequest,
   EditLockControllerAcquireMutationResponse,
   EditLockControllerAcquirePathParams,
   EditLockControllerAcquire403,
   EditLockControllerAcquire503,
} from '../models/EditLockControllerAcquire';

function getEditLockControllerAcquireUrl(
   entity: EditLockControllerAcquirePathParams['entity'],
   id: EditLockControllerAcquirePathParams['id'],
) {
   const res = { method: 'PUT', url: `/edit-locks/${entity}/${id}` as const };
   return res;
}

export async function editLockControllerAcquire(
   entity: EditLockControllerAcquirePathParams['entity'],
   id: EditLockControllerAcquirePathParams['id'],
   data: EditLockControllerAcquireMutationRequest,
   config: Partial<RequestConfig<EditLockControllerAcquireMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      EditLockControllerAcquireMutationResponse,
      ResponseErrorConfig<EditLockControllerAcquire403 | EditLockControllerAcquire503>,
      EditLockControllerAcquireMutationRequest
   >({
      method: 'PUT',
      url: getEditLockControllerAcquireUrl(entity, id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
