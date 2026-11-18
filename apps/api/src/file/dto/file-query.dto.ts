import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

const MIME_TYPE_PREFIX_SOURCE = '^[a-z]+/[a-z0-9.+-]*$';

export const MIME_TYPE_PREFIX_PATTERN = new RegExp(MIME_TYPE_PREFIX_SOURCE);

const MIME_TYPE_PREFIX_MAX_LENGTH = 100;

export class FileQueryDto extends PaginationQueryDto {
   @ApiPropertyOptional({
      description:
         'Only files whose MIME type starts with this prefix, e.g. `image/` for all images or ' +
         '`application/pdf`. Lowercase, must contain the slash.',
      example: 'image/',
      pattern: MIME_TYPE_PREFIX_SOURCE,
      maxLength: MIME_TYPE_PREFIX_MAX_LENGTH,
   })
   @IsOptional()
   @IsString()
   @MaxLength(MIME_TYPE_PREFIX_MAX_LENGTH)
   @Matches(MIME_TYPE_PREFIX_PATTERN, {
      message: 'mimeTypePrefix must be a MIME type prefix such as image/ or application/pdf',
   })
   mimeTypePrefix?: string;
}
