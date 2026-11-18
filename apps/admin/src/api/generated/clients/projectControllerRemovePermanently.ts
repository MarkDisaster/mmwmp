/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   ProjectControllerRemovePermanentlyMutationResponse,
   ProjectControllerRemovePermanentlyPathParams,
   ProjectControllerRemovePermanently404,
} from '../models/ProjectControllerRemovePermanently';

function getProjectControllerRemovePermanentlyUrl(
   id: ProjectControllerRemovePermanentlyPathParams['id'],
) {
   const res = { method: 'DELETE', url: `/projects/${id}/permanent` as const };
   return res;
}

export async function projectControllerRemovePermanently(
   id: ProjectControllerRemovePermanentlyPathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerRemovePermanentlyMutationResponse,
      ResponseErrorConfig<ProjectControllerRemovePermanently404>,
      unknown
   >({
      method: 'DELETE',
      url: getProjectControllerRemovePermanentlyUrl(id).url.toString(),
      ...requestConfig,
   });
   return res;
}
