import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsIn } from 'class-validator';

import { REVALIDATION_TAGS, type RevalidationTag } from '../revalidation.service';

export class RevalidateWebsiteDto {
   @ApiProperty({
      description: 'Cache tags of the public web to refresh',
      enum: REVALIDATION_TAGS,
      isArray: true,
   })
   @ArrayMinSize(1)
   @ArrayMaxSize(REVALIDATION_TAGS.length)
   @ArrayUnique()
   @IsIn(REVALIDATION_TAGS, { each: true })
   tags!: RevalidationTag[];
}
