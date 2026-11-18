/* eslint-disable */

import fetch from './../../axiosClient';
import type { Client, RequestConfig, ResponseErrorConfig } from './../../axiosClient';
import type {
   UserControllerFindOneQueryResponse,
   UserControllerFindOnePathParams,
   UserControllerFindOne404,
} from '../models/UserControllerFindOne';

function getUserControllerFindOneUrl(id: UserControllerFindOnePathParams['id']) {
   const res = { method: 'GET', url: `/users/${id}` as const };
   return res;
}

export async function userControllerFindOne(
   id: UserControllerFindOnePathParams['id'],
   config: Partial<RequestConfig> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const res = await request<
      UserControllerFindOneQueryResponse,
      ResponseErrorConfig<UserControllerFindOne404>,
      unknown
   >({ method: 'GET', url: getUserControllerFindOneUrl(id).url.toString(), ...requestConfig });
   return res;
}
