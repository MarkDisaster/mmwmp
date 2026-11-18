import type { AxiosError, AxiosRequestConfig } from 'axios';

import { api } from '@/utils/axios';

export type RequestConfig<TData = unknown> = {
   url?: string;
   method: 'GET' | 'PUT' | 'PATCH' | 'POST' | 'DELETE' | 'OPTIONS' | 'HEAD';
   params?: unknown;
   data?: TData | FormData;
   responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';
   signal?: AbortSignal;
   headers?: AxiosRequestConfig['headers'];
};

type ResponseConfig<TData = unknown> = {
   data: TData;
   status: number;
   statusText: string;
};

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>;

export type Client = typeof kubbClient;

const kubbClient = async <TData, _TError = unknown, TVariables = unknown>(
   config: RequestConfig<TVariables>,
): Promise<ResponseConfig<TData>> => {
   const response = await api(config as AxiosRequestConfig);
   return { data: response.data, status: response.status, statusText: response.statusText };
};

export default kubbClient;
