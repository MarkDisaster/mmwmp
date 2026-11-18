import { ApiProperty } from '@nestjs/swagger';

import { MAX_RANK_COUNTED } from '../runner-score.rules';

export class RunnerRankEntity {
   @ApiProperty({
      description: `Place on the leaderboard the score would take, from 1; counted up to ${MAX_RANK_COUNTED} runs ahead, a score with more ranks ${MAX_RANK_COUNTED + 1}`,
   })
   rank!: number;
}
