import { ApiProperty } from '@nestjs/swagger';

import { MIN_KEPT_RUN_SECONDS } from '../runner-score.rules';

export class RunnerScoreNotKeptEntity {
   @ApiProperty({
      description: 'Always false: the run was accepted but not stored',
      example: false,
   })
   kept!: false;

   @ApiProperty({
      description:
         'Seconds a run has to last to be stored (a longer run can still go unstored over the daily number)',
      example: MIN_KEPT_RUN_SECONDS,
   })
   minSeconds!: number;
}
