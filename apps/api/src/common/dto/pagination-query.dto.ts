import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
   @ApiPropertyOptional({ description: 'Page number (0-indexed)', default: 0 })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(0)
   page: number = 0;

   @ApiPropertyOptional({ description: 'Items per page' })
   @IsOptional()
   @Type(() => Number)
   @IsInt()
   @Min(1)
   @Max(100)
   limit?: number;

   @ApiPropertyOptional({ description: 'Field to sort by' })
   @IsOptional()
   @IsString()
   sortBy?: string;

   @ApiPropertyOptional({ description: 'Sort direction', enum: ['asc', 'desc'], default: 'asc' })
   @IsOptional()
   @IsIn(['asc', 'desc'])
   sortOrder?: 'asc' | 'desc' = 'asc';

   @ApiPropertyOptional({ description: 'Search query (case-insensitive)' })
   @IsOptional()
   @IsString()
   search?: string;
}
