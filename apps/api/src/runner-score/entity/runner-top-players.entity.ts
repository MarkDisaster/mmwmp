import { ApiProperty } from '@nestjs/swagger';

class RunnerTopPlayer {
   @ApiProperty({ example: 'MMK' })
   nick!: string;

   @ApiProperty({ description: 'The score of one visible run' })
   score!: number;

   @ApiProperty({ description: 'How long the run lasted, in whole seconds', example: 75 })
   seconds!: number;
}

export class RunnerTopPlayersEntity {
   @ApiProperty({
      type: [RunnerTopPlayer],
      description:
         'The best visible runs, highest first, equal scores in the order they were saved; a nick can appear several times',
   })
   players!: RunnerTopPlayer[];
}
