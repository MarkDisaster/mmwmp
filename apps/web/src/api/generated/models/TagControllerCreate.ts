/* eslint-disable */

import type { CreateTagDto } from './CreateTagDto';
import type { TagEntity } from './TagEntity';

export type TagControllerCreate201 = TagEntity;

export type TagControllerCreate409 = any;

export type TagControllerCreateMutationRequest = CreateTagDto;

export type TagControllerCreateMutationResponse = TagControllerCreate201;

export type TagControllerCreateMutation = {
   Response: TagControllerCreate201;
   Request: TagControllerCreateMutationRequest;
   Errors: TagControllerCreate409;
};
