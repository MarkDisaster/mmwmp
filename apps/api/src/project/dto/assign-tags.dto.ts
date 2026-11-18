import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';

export class AssignTagsDto {
   @ApiProperty({ description: 'Array of tag IDs to assign', type: [Number] })
   @IsArray()
   @IsInt({ each: true })
   tagIds!: number[];

   @ExpectedVersion()
   version?: number;
}
