/* eslint-disable */

import type { StreamChatBodyDto } from './StreamChatBodyDto';

export type ChatControllerStreamPathParams = {
   id: string;
};

export type ChatControllerStream200 = any;

export type ChatControllerStream429 = any;

export type ChatControllerStreamMutationRequest = StreamChatBodyDto;

export type ChatControllerStreamMutationResponse = ChatControllerStream200;

export type ChatControllerStreamMutation = {
   Response: ChatControllerStream200;
   Request: ChatControllerStreamMutationRequest;
   PathParams: ChatControllerStreamPathParams;
   Errors: ChatControllerStream429;
};
