import { ApiProperty } from '@nestjs/swagger';

import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';

import { AdminEventAction } from '../enum/admin-event-action.enum';

export class AdminEventEntity {
   @ApiProperty({ enum: EditLockEntity, enumName: 'EditLockEntity' })
   entity!: EditLockEntity;

   @ApiProperty({ description: 'Id of the record', example: 12 })
   id!: number;

   @ApiProperty({ enum: AdminEventAction, enumName: 'AdminEventAction' })
   action!: AdminEventAction;

   @ApiProperty({
      description: 'Version of the record after the change; `null` for a permanent delete',
      nullable: true,
      type: Number,
   })
   version!: number | null;
}
