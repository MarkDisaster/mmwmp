/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { MoveItemDto } from './MoveItemDto';

export type TagControllerMovePathParams = {
   id: number;
};

export type TagControllerMove204 = any;

export type TagControllerMove400 = any;

export type TagControllerMove404 = any;

export type TagControllerMove409 = ErrorResponseDto;

export type TagControllerMoveMutationRequest = MoveItemDto;

export type TagControllerMoveMutationResponse = TagControllerMove204;

export type TagControllerMoveMutation = {
   Response: TagControllerMove204;
   Request: TagControllerMoveMutationRequest;
   PathParams: TagControllerMovePathParams;
   Errors: TagControllerMove400 | TagControllerMove404 | TagControllerMove409;
};
