/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   ProjectControllerFindOneQueryResponse,
   ProjectControllerFindOnePathParams,
   ProjectControllerFindOne404,
} from '../models/ProjectControllerFindOne';

function getProjectControllerFindOneUrl(id: ProjectControllerFindOnePathParams['id']) {
   const res = { method: 'GET', url: `/projects/${id}` as const };
   return res;
}

export async function projectControllerFindOne(
   id: ProjectControllerFindOnePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      ProjectControllerFindOneQueryResponse,
      ResponseErrorConfig<ProjectControllerFindOne404>,
      unknown
   >({ method: 'GET', url: getProjectControllerFindOneUrl(id).url.toString(), ...requestConfig });
   return res;
}
