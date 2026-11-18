/* eslint-disable */

import type { PublicProjectEntity } from './PublicProjectEntity';

export type ProjectPublicControllerFindBySlugPathParams = {
   slug: string;
};

export type ProjectPublicControllerFindBySlugHeaderParams = {
   Authorization?: string;
   'Accept-Language'?: string;
};

export type ProjectPublicControllerFindBySlug200 = PublicProjectEntity;

export type ProjectPublicControllerFindBySlug404 = any;

export type ProjectPublicControllerFindBySlugQueryResponse = ProjectPublicControllerFindBySlug200;

export type ProjectPublicControllerFindBySlugQuery = {
   Response: ProjectPublicControllerFindBySlug200;
   PathParams: ProjectPublicControllerFindBySlugPathParams;
   HeaderParams: ProjectPublicControllerFindBySlugHeaderParams;
   Errors: ProjectPublicControllerFindBySlug404;
};
