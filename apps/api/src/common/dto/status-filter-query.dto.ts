import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { EntityStatus } from '@/generated/prisma/enums';

import { PaginationQueryDto } from './pagination-query.dto';

export class StatusFilterQueryDto extends PaginationQueryDto {
   @ApiPropertyOptional({ description: 'Only items with this status', enum: EntityStatus })
   @IsOptional()
   @IsEnum(EntityStatus)
   status?: EntityStatus;
}
