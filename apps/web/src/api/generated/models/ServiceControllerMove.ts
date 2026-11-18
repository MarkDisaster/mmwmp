/* eslint-disable */

import type { ErrorResponseDto } from './ErrorResponseDto';
import type { MoveItemDto } from './MoveItemDto';

export type ServiceControllerMovePathParams = {
   id: number;
};

export type ServiceControllerMove204 = any;

export type ServiceControllerMove400 = any;

export type ServiceControllerMove404 = any;

export type ServiceControllerMove409 = ErrorResponseDto;

export type ServiceControllerMoveMutationRequest = MoveItemDto;

export type ServiceControllerMoveMutationResponse = ServiceControllerMove204;

export type ServiceControllerMoveMutation = {
   Response: ServiceControllerMove204;
   Request: ServiceControllerMoveMutationRequest;
   PathParams: ServiceControllerMovePathParams;
   Errors: ServiceControllerMove400 | ServiceControllerMove404 | ServiceControllerMove409;
};
