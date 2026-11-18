import { ApiProperty } from '@nestjs/swagger';

export class EditLockHolderEntity {
   @ApiProperty({ description: 'The user who holds the lock', example: 3 })
   userId!: number;

   @ApiProperty({ description: 'Full name of that user', example: 'Jana Nováková' })
   name!: string;

   @ApiProperty({ description: 'When the lock was taken (ISO 8601)', format: 'date-time' })
   since!: string;
}

export class EditLockStateEntity {
   @ApiProperty({
      description: 'Who holds the lock, `null` when nobody does',
      type: EditLockHolderEntity,
      nullable: true,
   })
   heldBy!: EditLockHolderEntity | null;

   @ApiProperty({ description: 'Whether the lock is held by the session that asked' })
   mine!: boolean;
}
