import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';

export class InteractionListQueryDto {
   @ApiPropertyOptional({ description: '1-based page number.', default: 1, minimum: 1 })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   readonly page?: number = 1;

   @ApiPropertyOptional({
      description: 'Page size (1..100).',
      default: 50,
      minimum: 1,
      maximum: 100,
   })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(100)
   readonly limit?: number = 50;

   @ApiPropertyOptional({ description: 'ISO-8601 lower bound (inclusive).' })
   @IsOptional()
   @IsISO8601()
   readonly from?: string;

   @ApiPropertyOptional({ description: 'ISO-8601 upper bound (exclusive).' })
   @IsOptional()
   @IsISO8601()
   readonly to?: string;

   @ApiPropertyOptional({ description: 'Filter by user id.' })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   readonly userId?: number;
}
