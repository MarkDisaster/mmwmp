import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength } from 'class-validator';

import { Language } from '@/generated/prisma/enums';

import { MAX_TAG_NAME_LENGTH } from '../tag.constants';

export class TagTranslationDto {
   @ApiProperty({ description: 'Language of the name', enum: Language })
   @IsEnum(Language)
   language!: Language;

   @ApiProperty({
      description:
         'Name of the tag in this language. An empty name is skipped (for `en` it means no ' +
         'English name, the web shows the Czech one); `cs` needs a non-empty name',
      maxLength: MAX_TAG_NAME_LENGTH,
   })
   @IsString()
   @MaxLength(MAX_TAG_NAME_LENGTH)
   name!: string;
}
