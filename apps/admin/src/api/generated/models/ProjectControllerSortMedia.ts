/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { ProjectEntity } from './ProjectEntity';
import type { SortProjectMediaDto } from './SortProjectMediaDto';

export type ProjectControllerSortMediaPathParams = {
   id: number;
};

export type ProjectControllerSortMedia200 = ProjectEntity;

export type ProjectControllerSortMedia404 = any;

export type ProjectControllerSortMedia409 = ErrorResponseDto;

export type ProjectControllerSortMediaMutationRequest = SortProjectMediaDto;

export type ProjectControllerSortMediaMutationResponse = ProjectControllerSortMedia200;

export type ProjectControllerSortMediaMutation = {
   Response: ProjectControllerSortMedia200;
   Request: ProjectControllerSortMediaMutationRequest;
   PathParams: ProjectControllerSortMediaPathParams;
   Errors: ProjectControllerSortMedia404 | ProjectControllerSortMedia409;
};
