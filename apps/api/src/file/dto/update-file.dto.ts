import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { Language } from '@/generated/prisma/enums';

import { MAX_ALT_TEXT_LENGTH, MAX_DISPLAY_NAME_LENGTH } from '../file.constants';

export class UpdateFileDto {
   @ApiPropertyOptional({
      description: 'Display name for the file. Trimmed; empty or null clears it',
      nullable: true,
      maxLength: MAX_DISPLAY_NAME_LENGTH,
   })
   @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
   @IsString()
   @MaxLength(MAX_DISPLAY_NAME_LENGTH)
   @IsOptional()
   displayName?: string | null;

   @ApiPropertyOptional({
      description:
         'Description of the image in the language of the file (the `alt` attribute on the web). ' +
         'Trimmed; empty or null clears it',
      nullable: true,
      maxLength: MAX_ALT_TEXT_LENGTH,
   })
   @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
   @IsString()
   @MaxLength(MAX_ALT_TEXT_LENGTH)
   @IsOptional()
   altText?: string | null;

   @ApiPropertyOptional({
      description: 'Language of the file content',
      nullable: true,
      enum: Language,
   })
   @IsEnum(Language)
   @IsOptional()
   language?: Language | null;

   @ExpectedVersion()
   version?: number;
}
