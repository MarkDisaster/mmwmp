import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

import { MIN_KEPT_RUN_SECONDS } from '../runner-score.rules';

const MAX_RUN_SECONDS = 24 * 60 * 60;
export const MAX_SCORE = 1_000_000;

export class CreateRunnerScoreDto {
   @ApiProperty({
      description: 'The run the score is from, as started by POST /public/runner-scores/runs',
      example: '5f0c1b2e-8d4a-4f6e-9b1a-2c3d4e5f6a7b',
   })
   @IsUUID('4')
   runId!: string;

   @ApiProperty({ description: 'Player nickname: one to three letters or digits', example: 'MMK' })
   @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
   @IsString()
   @Matches(/^[A-Z0-9]{1,3}$/, { message: 'nick must be one to three letters or digits' })
   nick!: string;

   @ApiProperty({ type: 'integer', description: 'Final score of the run', example: 1186 })
   @IsInt()
   @Min(0)
   @Max(MAX_SCORE)
   score!: number;

   @ApiProperty({
      type: 'integer',
      description: `Whole seconds the run lasted; runs under ${MIN_KEPT_RUN_SECONDS} s are accepted but not stored`,
      example: 300,
   })
   @IsInt()
   @Min(0)
   @Max(MAX_RUN_SECONDS)
   seconds!: number;
}
