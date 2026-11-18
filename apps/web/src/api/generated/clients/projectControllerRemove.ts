/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerRemoveMutationResponse,
   ProjectControllerRemovePathParams,
   ProjectControllerRemove404,
} from '../models/ProjectControllerRemove';

function getProjectControllerRemoveUrl(id: ProjectControllerRemovePathParams['id']) {
   const res = { method: 'DELETE', url: `/projects/${id}` as const };
   return res;
}

export async function projectControllerRemove(
   id: ProjectControllerRemovePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerRemoveMutationResponse,
      ResponseErrorConfig<ProjectControllerRemove404>,
      unknown
   >({ method: 'DELETE', url: getProjectControllerRemoveUrl(id).url.toString(), ...requestConfig });
   return res;
}
