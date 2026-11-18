import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReleaseEditLockDto {
   @ApiProperty({ description: 'Random id of the open browser tab', minLength: 8, maxLength: 64 })
   @IsString()
   @MinLength(8)
   @MaxLength(64)
   sessionId!: string;
}
