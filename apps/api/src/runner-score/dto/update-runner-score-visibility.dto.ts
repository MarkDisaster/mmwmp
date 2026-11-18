import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRunnerScoreVisibilityDto {
   @ApiProperty({ description: 'Hidden scores stay stored but are not shown publicly' })
   @IsBoolean()
   hidden!: boolean;
}
