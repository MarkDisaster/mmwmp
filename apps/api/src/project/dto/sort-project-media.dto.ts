import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';

export class SortProjectMediaDto {
   @ApiProperty({
      description: 'Ordered array of media IDs defining the new sort order',
      type: [Number],
   })
   @IsArray()
   @IsInt({ each: true })
   mediaIds!: number[];

   @ExpectedVersion()
   version?: number;
}
