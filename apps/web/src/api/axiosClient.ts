import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import { env } from '@/env';

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
   headers: AxiosResponse['headers'];
};

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>;

export type Client = <TData, _TError = unknown, TRequestData = unknown>(
   config: RequestConfig<TRequestData>,
) => Promise<ResponseConfig<TData>>;

const API_TIMEOUT_MS = 10_000;

const axiosInstance = axios.create({
   baseURL: env.NEXT_PUBLIC_API_URL,
   timeout: API_TIMEOUT_MS,
});

const client = async <TData, TError = unknown, TVariables = unknown>(
   config: RequestConfig<TVariables>,
): Promise<ResponseConfig<TData>> => {
   return axiosInstance
      .request<TData, ResponseConfig<TData>>({ ...config })
      .catch((e: AxiosError<TError>) => {
         throw e;
      });
};

export default client;
