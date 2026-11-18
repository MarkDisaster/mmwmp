import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { Language } from '@/generated/prisma/enums';

import { MAX_DISPLAY_NAME_LENGTH } from '../file.constants';

export class UploadFileDto {
   @ApiPropertyOptional({
      description: 'Display name for the file. Trimmed',
      maxLength: MAX_DISPLAY_NAME_LENGTH,
   })
   @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
   @IsString()
   @MaxLength(MAX_DISPLAY_NAME_LENGTH)
   @IsOptional()
   displayName?: string;

   @ApiPropertyOptional({ description: 'Language of the file content', enum: Language })
   @IsEnum(Language)
   @IsOptional()
   language?: Language;
}

export class UploadFileBodyDto extends UploadFileDto {
   @ApiProperty({ type: 'string', format: 'binary', description: 'The file, at most 10 MB' })
   file!: unknown;
}
