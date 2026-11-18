/* eslint-disable */

import type { AdminEventEntity } from './AdminEventEntity';
import type { ErrorResponseDto } from './ErrorResponseDto';

export type AdminEventsControllerStream200 = AdminEventEntity;

export type AdminEventsControllerStream429 = ErrorResponseDto;

export type AdminEventsControllerStreamQueryResponse = AdminEventsControllerStream200;

export type AdminEventsControllerStreamQuery = {
   Response: AdminEventsControllerStream200;
   Errors: AdminEventsControllerStream429;
};
