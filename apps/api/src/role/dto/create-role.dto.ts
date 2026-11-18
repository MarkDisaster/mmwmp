import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateRoleDto {
   @ApiProperty({ example: 'content-editor' })
   @IsString()
   @MinLength(2)
   name!: string;
}
