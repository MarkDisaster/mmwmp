import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   ArrayMaxSize,
   ArrayMinSize,
   ArrayUnique,
   IsArray,
   IsBoolean,
   IsEnum,
   IsInt,
   IsOptional,
   IsPositive,
   IsString,
   Matches,
   ValidateNested,
} from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { EntityStatus, Language } from '@/generated/prisma/enums';

export class SaveServiceTranslationDto {
   @ApiProperty({ description: 'Language of the translation', enum: Language })
   @IsEnum(Language)
   language!: Language;

   @ApiProperty({
      description: 'Service title. A translation with an empty title is skipped, not saved',
   })
   @IsString()
   title!: string;

   @ApiProperty({
      description: 'Short description; left out or null clears it',
      type: String,
      nullable: true,
      required: false,
   })
   @IsString()
   @IsOptional()
   description?: string | null;

   @ApiProperty({
      description: 'Rich text content (sanitised on save); left out or null clears it',
      type: String,
      nullable: true,
      required: false,
   })
   @IsString()
   @IsOptional()
   content?: string | null;

   @ApiProperty({
      type: String,
      description: 'SEO meta title (empty or null clears it)',
      required: false,
      nullable: true,
   })
   @IsString()
   @IsOptional()
   metaTitle?: string | null;

   @ApiProperty({
      type: String,
      description: 'SEO meta description (empty or null clears it)',
      required: false,
      nullable: true,
   })
   @IsString()
   @IsOptional()
   metaDescription?: string | null;
}

const MAX_SERVICE_PROJECTS = 200;

export class SaveServiceDto {
   @ApiProperty({ description: 'URL-friendly slug (lowercase alphanumeric with hyphens)' })
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   slug!: string;

   @ApiProperty({ description: 'Whether to show this service on the homepage' })
   @IsBoolean()
   showOnHomepage!: boolean;

   @ApiProperty({
      description:
         'Publication status. Left out keeps the current one (a new service starts as a draft); ' +
         'changing it needs the publish permission',
      enum: EntityStatus,
      required: false,
   })
   @IsEnum(EntityStatus)
   @IsOptional()
   status?: EntityStatus;

   @ApiProperty({
      description:
         'Translations, one per language. Those with a non-empty title are created or updated; ' +
         'languages that are not sent are left as they are. At least one needs a title',
      type: [SaveServiceTranslationDto],
   })
   @IsArray()
   @ArrayMinSize(1)
   @ArrayUnique((translation?: SaveServiceTranslationDto) => translation?.language, {
      message: 'Each language may be sent only once',
   })
   @ValidateNested({ each: true })
   @Type(() => SaveServiceTranslationDto)
   translations!: SaveServiceTranslationDto[];

   @ApiProperty({
      description: 'IDs of the assigned projects in display order (replaces the existing ones)',
      type: [Number],
      maxItems: MAX_SERVICE_PROJECTS,
   })
   @IsArray()
   @ArrayMaxSize(MAX_SERVICE_PROJECTS)
   @IsInt({ each: true })
   @IsPositive({ each: true })
   projectIds!: number[];

   @ExpectedVersion()
   version?: number;
}
