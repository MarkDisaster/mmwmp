/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { TagEntity } from './TagEntity';
import type { UpdateTagDto } from './UpdateTagDto';

export type TagControllerUpdatePathParams = {
   id: number;
};

export type TagControllerUpdate200 = TagEntity;

export type TagControllerUpdate404 = any;

export type TagControllerUpdate409 = ErrorResponseDto;

export type TagControllerUpdateMutationRequest = UpdateTagDto;

export type TagControllerUpdateMutationResponse = TagControllerUpdate200;

export type TagControllerUpdateMutation = {
   Response: TagControllerUpdate200;
   Request: TagControllerUpdateMutationRequest;
   PathParams: TagControllerUpdatePathParams;
   Errors: TagControllerUpdate404 | TagControllerUpdate409;
};
