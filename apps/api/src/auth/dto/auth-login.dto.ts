import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { NormalizeEmail } from '@/common/decorators/normalize-email.decorator';

export class AuthLoginDto {
   @ApiProperty({ description: 'Email address', example: 'user@example.com' })
   @NormalizeEmail()
   @IsEmail()
   email!: string;

   @ApiProperty({ description: 'Password', minLength: 8 })
   @IsString()
   @MinLength(8)
   password!: string;
}
