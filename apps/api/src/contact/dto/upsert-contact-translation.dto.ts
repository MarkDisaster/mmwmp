import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { Language } from '@/generated/prisma/enums';

import { MAX_ABOUT_TITLE_LENGTH } from '../contact.constants';

export class UpsertContactTranslationDto {
   @ApiProperty({ enum: Language })
   @IsEnum(Language)
   language!: Language;

   @ApiProperty({ description: 'Localized about-me description', required: false })
   @IsString()
   @IsOptional()
   description?: string | null;

   @ApiProperty({
      description:
         'Localized heading of the About section. Plain text (HTML is stripped), trimmed. ' +
         'Omit to keep the current value; empty or null clears it and the web falls back to ' +
         'its default title',
      required: false,
      nullable: true,
      maxLength: MAX_ABOUT_TITLE_LENGTH,
   })
   @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
   @IsString()
   @MaxLength(MAX_ABOUT_TITLE_LENGTH)
   @IsOptional()
   aboutTitle?: string | null;
}
