import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsPositive, IsString, MinLength } from 'class-validator';

import { NormalizeEmail } from '@/common/decorators/normalize-email.decorator';

export class CreateUserDto {
   @ApiProperty({ example: 'user@example.com' })
   @NormalizeEmail()
   @IsEmail()
   email!: string;

   @ApiProperty()
   @IsString()
   @IsNotEmpty()
   firstName!: string;

   @ApiProperty()
   @IsString()
   @IsNotEmpty()
   lastName!: string;

   @ApiProperty({ minLength: 8 })
   @IsString()
   @MinLength(8)
   password!: string;

   @ApiProperty({ description: 'ID of the role to assign' })
   @IsInt()
   @IsPositive()
   roleId!: number;
}
