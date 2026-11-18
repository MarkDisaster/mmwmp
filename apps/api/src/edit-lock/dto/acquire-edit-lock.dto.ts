import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AcquireEditLockDto {
   @ApiProperty({ description: 'Random id of the open browser tab', minLength: 8, maxLength: 64 })
   @IsString()
   @MinLength(8)
   @MaxLength(64)
   sessionId!: string;

   @ApiPropertyOptional({
      description: 'Take the lock from the user who holds it (default: leave it with them)',
      default: false,
   })
   @IsOptional()
   @IsBoolean()
   takeOver?: boolean;
}
