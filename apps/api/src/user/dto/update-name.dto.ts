import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateNameDto {
   @ApiProperty({ description: 'First name' })
   @IsString()
   @IsNotEmpty()
   firstName!: string;

   @ApiProperty({ description: 'Last name' })
   @IsString()
   @IsNotEmpty()
   lastName!: string;
}
