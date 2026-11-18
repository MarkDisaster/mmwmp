import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { Language } from '@/generated/prisma/enums';

export class AddProjectMediaDto {
   @ApiProperty({ description: 'File ID to attach' })
   @IsInt()
   fileId!: number;

   @ApiProperty({
      description: 'Language association for the media item',
      enum: Language,
      required: false,
   })
   @IsEnum(Language)
   @IsOptional()
   language?: Language;

   @ApiProperty({ description: 'Sort order within the project media list', required: false })
   @IsInt()
   @IsOptional()
   sortOrder?: number;

   @ExpectedVersion()
   version?: number;
}
