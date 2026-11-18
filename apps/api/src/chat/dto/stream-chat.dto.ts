import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   ArrayMaxSize,
   ArrayMinSize,
   IsArray,
   IsObject,
   IsOptional,
   IsString,
   Matches,
   MaxLength,
   ValidateNested,
} from 'class-validator';

const STREAM_MESSAGES_MAX = 200;
const PAGE_PATH_MAX_LENGTH = 200;

export class ChatPageContextDto {
   @ApiProperty({
      description: 'Pathname of the admin page, e.g. `/projects/12`.',
      example: '/projects/12',
      maxLength: PAGE_PATH_MAX_LENGTH,
   })
   @IsString()
   @MaxLength(PAGE_PATH_MAX_LENGTH)
   @Matches(/^\//, { message: 'pageContext.path must start with /' })
   readonly path!: string;
}

export class StreamChatBodyDto {
   @ApiProperty({
      description: 'Vercel AI SDK `UIMessage[]` (the `useChat()` wire shape).',
      type: 'array',
      items: { type: 'object' },
   })
   @IsArray()
   @ArrayMinSize(1)
   @ArrayMaxSize(STREAM_MESSAGES_MAX)
   @IsObject({ each: true })
   readonly messages!: unknown[];

   @ApiPropertyOptional({
      type: ChatPageContextDto,
      description:
         'The admin page open while the message is sent (`DefaultChatTransport` `body`), so ' +
         '"this project" can be resolved. Optional.',
   })
   @IsOptional()
   @ValidateNested()
   @Type(() => ChatPageContextDto)
   readonly pageContext?: ChatPageContextDto;
}
