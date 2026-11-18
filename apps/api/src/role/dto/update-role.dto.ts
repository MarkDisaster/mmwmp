import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UpdateRoleDto {
   @ApiProperty({ example: 'senior-editor' })
   @IsString()
   @MinLength(2)
   name!: string;
}
