import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   ArrayMaxSize,
   ArrayMinSize,
   ArrayUnique,
   IsArray,
   IsNotEmpty,
   IsOptional,
   IsString,
   Matches,
   ValidateNested,
} from 'class-validator';

import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { Language } from '@/generated/prisma/enums';

import { TagTranslationDto } from './tag-translation.dto';

export class CreateTagDto {
   @ApiProperty({ description: 'URL-friendly slug, the language-independent identity of the tag' })
   @IsString()
   @IsNotEmpty()
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   slug!: string;

   @ApiProperty({ description: 'Tag color (hex or CSS color)', required: false })
   @IsString()
   @IsOptional()
   color?: string;

   @ApiProperty({
      description:
         'Names of the tag, one per language. `cs` is required (400 without a non-empty ' +
         'one), `en` is optional and the web falls back to `cs` without it',
      type: [TagTranslationDto],
      minItems: 1,
      maxItems: Object.keys(Language).length,
   })
   @IsArray()
   @ArrayMinSize(1)
   @ArrayMaxSize(Object.keys(Language).length)
   @ArrayUnique((translation?: TagTranslationDto) => translation?.language, {
      message: 'Each language may be sent only once',
   })
   @ValidateNested({ each: true })
   @Type(() => TagTranslationDto)
   translations!: TagTranslationDto[];
}
