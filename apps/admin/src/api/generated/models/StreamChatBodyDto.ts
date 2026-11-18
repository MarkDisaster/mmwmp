/* eslint-disable */

import type { ChatPageContextDto } from './ChatPageContextDto';

export type StreamChatBodyDto = {
   messages: object[];
   pageContext?: ChatPageContextDto;
};
