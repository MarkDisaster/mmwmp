/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { MoveItemDto } from './MoveItemDto';

export type ProjectControllerMovePathParams = {
   id: number;
};

export type ProjectControllerMove204 = any;

export type ProjectControllerMove400 = any;

export type ProjectControllerMove404 = any;

export type ProjectControllerMove409 = ErrorResponseDto;

export type ProjectControllerMoveMutationRequest = MoveItemDto;

export type ProjectControllerMoveMutationResponse = ProjectControllerMove204;

export type ProjectControllerMoveMutation = {
   Response: ProjectControllerMove204;
   Request: ProjectControllerMoveMutationRequest;
   PathParams: ProjectControllerMovePathParams;
   Errors: ProjectControllerMove400 | ProjectControllerMove404 | ProjectControllerMove409;
};
