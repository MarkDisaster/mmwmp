/* eslint-disable */

import type { ContactEntity } from './ContactEntity';
import type { ErrorResponseDto } from './ErrorResponseDto';
import type { UpsertContactDto } from './UpsertContactDto';

export type ContactControllerUpsert200 = ContactEntity;

export type ContactControllerUpsert409 = ErrorResponseDto;

export type ContactControllerUpsertMutationRequest = UpsertContactDto;

export type ContactControllerUpsertMutationResponse = ContactControllerUpsert200;

export type ContactControllerUpsertMutation = {
   Response: ContactControllerUpsert200;
   Request: ContactControllerUpsertMutationRequest;
   Errors: ContactControllerUpsert409;
};
