import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Min } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { MOVE_POSITIONS, type MovePosition } from '@/common/sort/move-positions';

export class MoveItemDto {
   @ApiProperty({ description: 'The item next to which the moved item is placed', type: 'integer' })
   @IsInt()
   @Min(1)
   targetId!: number;

   @ApiProperty({
      description: 'Where the moved item goes relative to the target',
      enum: MOVE_POSITIONS,
   })
   @IsIn(MOVE_POSITIONS)
   position!: MovePosition;

   @ExpectedVersion()
   version?: number;
}
