import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive } from 'class-validator';

export class UpdateUserRoleDto {
   @ApiProperty()
   @IsInt()
   @IsPositive()
   roleId!: number;
}
