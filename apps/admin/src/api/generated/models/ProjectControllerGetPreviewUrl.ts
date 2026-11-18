/* eslint-disable */

import type { ProjectPreviewUrlEntity } from './ProjectPreviewUrlEntity';

export type ProjectControllerGetPreviewUrlPathParams = {
   id: number;
};

export type ProjectControllerGetPreviewUrlQueryParams = {
   locale?: string;
};

export type ProjectControllerGetPreviewUrl200 = ProjectPreviewUrlEntity;

export type ProjectControllerGetPreviewUrl404 = any;

export type ProjectControllerGetPreviewUrlQueryResponse = ProjectControllerGetPreviewUrl200;

export type ProjectControllerGetPreviewUrlQuery = {
   Response: ProjectControllerGetPreviewUrl200;
   PathParams: ProjectControllerGetPreviewUrlPathParams;
   QueryParams: ProjectControllerGetPreviewUrlQueryParams;
   Errors: ProjectControllerGetPreviewUrl404;
};
