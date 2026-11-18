/* eslint-disable */

export type ServiceControllerGetPreviewUrlPathParams = {
   id: number;
};

export type ServiceControllerGetPreviewUrlQueryParams = {
   locale?: string;
};

export type ServiceControllerGetPreviewUrl200 = any;

export type ServiceControllerGetPreviewUrl404 = any;

export type ServiceControllerGetPreviewUrlQueryResponse = ServiceControllerGetPreviewUrl200;

export type ServiceControllerGetPreviewUrlQuery = {
   Response: ServiceControllerGetPreviewUrl200;
   PathParams: ServiceControllerGetPreviewUrlPathParams;
   QueryParams: ServiceControllerGetPreviewUrlQueryParams;
   Errors: ServiceControllerGetPreviewUrl404;
};
