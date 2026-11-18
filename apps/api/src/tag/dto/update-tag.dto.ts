import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   ArrayMaxSize,
   ArrayMinSize,
   ArrayUnique,
   IsArray,
   IsOptional,
   IsString,
   ValidateNested,
} from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { Language } from '@/generated/prisma/enums';

import { TagTranslationDto } from './tag-translation.dto';

export class UpdateTagDto {
   @ApiProperty({ description: 'URL-friendly slug', required: false })
   @IsString()
   @IsOptional()
   slug?: string;

   @ApiProperty({ description: 'Tag color (hex or CSS color)', required: false })
   @IsString()
   @IsOptional()
   color?: string;

   @ApiProperty({
      description:
         'The complete set of names the tag should have, one per language; left out keeps the ' +
         'stored names. `cs` is required (400 without a non-empty one). A language that is not ' +
         'sent, or sent with an empty name, is removed (for `en`: no English name, the web ' +
         'falls back to `cs`)',
      type: [TagTranslationDto],
      required: false,
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
   @IsOptional()
   translations?: TagTranslationDto[];

   @ExpectedVersion()
   version?: number;
}
