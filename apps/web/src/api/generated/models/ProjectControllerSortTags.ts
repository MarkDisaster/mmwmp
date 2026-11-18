/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';
import type { SortProjectTagsDto } from './SortProjectTagsDto';

export type ProjectControllerSortTagsPathParams = {
   id: number;
};

export type ProjectControllerSortTags200 = ProjectEntity;

export type ProjectControllerSortTags404 = any;

export type ProjectControllerSortTags409 = ErrorResponseDto;

export type ProjectControllerSortTagsMutationRequest = SortProjectTagsDto;

export type ProjectControllerSortTagsMutationResponse = ProjectControllerSortTags200;

export type ProjectControllerSortTagsMutation = {
   Response: ProjectControllerSortTags200;
   Request: ProjectControllerSortTagsMutationRequest;
   PathParams: ProjectControllerSortTagsPathParams;
   Errors: ProjectControllerSortTags404 | ProjectControllerSortTags409;
};
