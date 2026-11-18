import { ApiProperty } from '@nestjs/swagger';

export class RunnerScoreEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({ example: 'MMK' })
   nick!: string;

   @ApiProperty()
   score!: number;

   @ApiProperty()
   seconds!: number;

   @ApiProperty()
   hidden!: boolean;

   @ApiProperty()
   createdAt!: Date;
}
