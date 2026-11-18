import { ApiProperty } from '@nestjs/swagger';

export class RunnerRunEntity {
   @ApiProperty({ description: 'The started run, sent back with its score' })
   runId!: string;
}
