import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

import { MAX_SCORE } from './create-runner-score.dto';

export class RunnerRankQueryDto {
   @ApiProperty({ type: 'integer', description: 'The score to rank', example: 296 })
   @Type(() => Number)
   @IsInt()
   @Min(0)
   @Max(MAX_SCORE)
   score!: number;
}
