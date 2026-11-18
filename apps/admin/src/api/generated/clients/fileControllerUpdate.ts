/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   FileControllerUpdateMutationRequest,
   FileControllerUpdateMutationResponse,
   FileControllerUpdatePathParams,
   FileControllerUpdate403,
   FileControllerUpdate404,
   FileControllerUpdate409,
} from '../models/FileControllerUpdate';

function getFileControllerUpdateUrl(id: FileControllerUpdatePathParams['id']) {
   const res = { method: 'PATCH', url: `/files/${id}` as const };
   return res;
}

export async function fileControllerUpdate(
   id: FileControllerUpdatePathParams['id'],
   data: FileControllerUpdateMutationRequest,
   config: Partial<RequestConfig<FileControllerUpdateMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;

   const res = await request<
      FileControllerUpdateMutationResponse,
      ResponseErrorConfig<
         FileControllerUpdate403 | FileControllerUpdate404 | FileControllerUpdate409
      >,
      FileControllerUpdateMutationRequest
   >({
      method: 'PATCH',
      url: getFileControllerUpdateUrl(id).url.toString(),
      data: requestData,
      ...requestConfig,
   });
   return res;
}
