import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';

import { EditLockEntity } from '../enum/edit-lock-entity.enum';

export class EditLockParamsDto {
   @ApiProperty({ enum: EditLockEntity, enumName: 'EditLockEntity' })
   @IsEnum(EditLockEntity)
   entity!: EditLockEntity;

   @ApiProperty({
      description: 'Id of the record, `0` for the contact (the only record without an id)',
      type: 'integer',
      minimum: 0,
   })
   @Type(() => Number)
   @IsInt()
   @Min(0)
   id!: number;
}
