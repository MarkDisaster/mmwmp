import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { EntityStatus } from '@/generated/prisma/enums';

export class UpdateStatusDto {
   @ApiProperty({ description: 'Publication status', enum: EntityStatus })
   @IsEnum(EntityStatus)
   status!: EntityStatus;

   @ExpectedVersion()
   version?: number;
}
