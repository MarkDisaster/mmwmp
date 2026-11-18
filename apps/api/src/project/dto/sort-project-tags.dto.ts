import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';

export class SortProjectTagsDto {
   @ApiProperty({
      description: 'Ordered array of tag IDs defining the new sort order',
      type: [Number],
   })
   @IsArray()
   @IsInt({ each: true })
   tagIds!: number[];

   @ExpectedVersion()
   version?: number;
}
