import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { AuditActorType } from '@/generated/prisma/enums';

export class ListAuditLogsDto {
   @ApiPropertyOptional({ description: 'Page number (0-indexed)', default: 0 })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(0)
   page: number = 0;

   @ApiPropertyOptional({ description: 'Items per page', default: 50 })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(200)
   limit: number = 50;

   @ApiPropertyOptional({ description: 'Filter by user id' })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   userId?: number;

   @ApiPropertyOptional({ description: 'Filter by action (e.g. project.create)' })
   @IsOptional()
   @IsString()
   action?: string;

   @ApiPropertyOptional({ description: 'Filter by resource type (e.g. project)' })
   @IsOptional()
   @IsString()
   resourceType?: string;

   @ApiPropertyOptional({ description: 'Filter by actor type', enum: AuditActorType })
   @IsOptional()
   @IsEnum(AuditActorType)
   actorType?: AuditActorType;

   @ApiPropertyOptional({ description: 'ISO date — only entries on or after' })
   @IsOptional()
   @IsDateString()
   from?: string;

   @ApiPropertyOptional({ description: 'ISO date — only entries on or before' })
   @IsOptional()
   @IsDateString()
   to?: string;
}
