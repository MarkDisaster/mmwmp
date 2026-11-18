import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsPositive } from 'class-validator';

import { NormalizeEmail } from '@/common/decorators/normalize-email.decorator';

export class UserInvitationDto {
   @ApiProperty({ example: 'user@example.com' })
   @NormalizeEmail()
   @IsEmail()
   email!: string;

   @ApiProperty({ description: 'ID of the role to assign to the invited user' })
   @IsInt()
   @IsPositive()
   roleId!: number;
}
