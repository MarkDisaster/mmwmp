import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
   @ApiProperty({ description: 'First name' })
   @IsString()
   @IsNotEmpty()
   firstName!: string;

   @ApiProperty({ description: 'Last name' })
   @IsString()
   @IsNotEmpty()
   lastName!: string;

   @ApiProperty({ description: 'Password', minLength: 8 })
   @IsString()
   @MinLength(8)
   password!: string;
}
