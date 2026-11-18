import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsPositive } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';

export class AssignProjectsDto {
   @ApiProperty({ description: 'Array of project IDs to assign', type: [Number] })
   @IsArray()
   @IsInt({ each: true })
   @IsPositive({ each: true })
   projectIds!: number[];

   @ExpectedVersion()
   version?: number;
}
