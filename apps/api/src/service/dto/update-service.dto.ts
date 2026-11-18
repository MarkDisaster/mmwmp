import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';

export class UpdateServiceDto {
   @ApiProperty({
      description: 'URL-friendly slug (lowercase alphanumeric with hyphens)',
      required: false,
   })
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   @IsOptional()
   slug?: string;

   @ApiProperty({ description: 'Whether to show this service on the homepage', required: false })
   @IsBoolean()
   @IsOptional()
   showOnHomepage?: boolean;

   @ExpectedVersion()
   version?: number;
}
