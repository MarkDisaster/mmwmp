/* eslint-disable */

import fetch from '../../kubbClient';
import type { Client, RequestConfig, ResponseErrorConfig } from '../../kubbClient';
import type {
   FileControllerUploadMutationRequest,
   FileControllerUploadMutationResponse,
   FileControllerUpload400,
   FileControllerUpload413,
} from '../models/FileControllerUpload';
import { buildFormData } from '../.kubb/config';

function getFileControllerUploadUrl() {
   const res = { method: 'POST', url: `/files` as const };
   return res;
}

export async function fileControllerUpload(
   data: FileControllerUploadMutationRequest,
   config: Partial<RequestConfig<FileControllerUploadMutationRequest>> & { client?: Client } = {},
) {
   const { client: request = fetch, ...requestConfig } = config;

   const requestData = data;
   const formData = buildFormData(requestData);
   const res = await request<
      FileControllerUploadMutationResponse,
      ResponseErrorConfig<FileControllerUpload400 | FileControllerUpload413>,
      FileControllerUploadMutationRequest
   >({
      method: 'POST',
      url: getFileControllerUploadUrl().url.toString(),
      data: formData as FormData,
      ...requestConfig,
   });
   return res;
}
