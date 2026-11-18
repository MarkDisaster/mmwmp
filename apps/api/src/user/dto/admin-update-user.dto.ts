import { ApiProperty } from '@nestjs/swagger';
import {
   IsEmail,
   IsInt,
   IsNotEmpty,
   IsOptional,
   IsPositive,
   IsString,
   ValidateIf,
} from 'class-validator';

import { NormalizeEmail } from '@/common/decorators/normalize-email.decorator';

export class AdminUpdateUserDto {
   @ApiProperty({ required: false })
   @IsString()
   @IsNotEmpty()
   @IsOptional()
   firstName?: string;

   @ApiProperty({ required: false })
   @IsString()
   @IsNotEmpty()
   @IsOptional()
   lastName?: string;

   @ApiProperty({
      required: false,
      description: 'Only an administrator can change the email of another user',
   })
   @NormalizeEmail()
   @IsEmail()
   @ValidateIf((_dto, value) => value !== undefined)
   email?: string;

   @ApiProperty({ required: false })
   @IsInt()
   @IsPositive()
   @IsOptional()
   roleId?: number;
}
