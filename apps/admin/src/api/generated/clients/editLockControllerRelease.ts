/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   EditLockControllerReleaseMutationRequest,
   EditLockControllerReleaseMutationResponse,
   EditLockControllerReleasePathParams,
   EditLockControllerRelease403,
   EditLockControllerRelease503,
} from '../models/EditLockControllerRelease';

function getEditLockControllerReleaseUrl(
   entity: EditLockControllerReleasePathParams['entity'],
   id: EditLockControllerReleasePathParams['id'],
) {
   const res = { method: 'DELETE', url: `/edit-locks/${entity}/${id}` as const };
   return res;
}

export async function editLockControllerRelease(
   entity: EditLockControllerReleasePathParams['entity'],
   id: EditLockControllerReleasePathParams['id'],
   data: EditLockControllerReleaseMutationRequest,
   config: Partial<RequestConfig<EditLockControllerReleaseMutationRequest>> & {
      client?: Client;
   } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      EditLockControllerReleaseMutationResponse,
      ResponseErrorConfig<EditLockControllerRelease403 | EditLockControllerRelease503>,
      EditLockControllerReleaseMutationRequest
   >({
      method: 'DELETE',
      url: getEditLockControllerReleaseUrl(entity, id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
