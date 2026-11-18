import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsPositive } from 'class-validator';

export class SummaryQueryDto {
   @ApiPropertyOptional({
      description: 'ISO-8601 lower bound (inclusive). Defaults to no lower bound.',
      example: '2026-05-01T00:00:00.000Z',
   })
   @IsOptional()
   @IsISO8601()
   readonly from?: string;

   @ApiPropertyOptional({
      description: 'ISO-8601 upper bound (exclusive). Defaults to no upper bound.',
      example: '2026-06-01T00:00:00.000Z',
   })
   @IsOptional()
   @IsISO8601()
   readonly to?: string;

   @ApiPropertyOptional({ description: 'Filter by user id.' })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @IsPositive()
   readonly userId?: number;
}
