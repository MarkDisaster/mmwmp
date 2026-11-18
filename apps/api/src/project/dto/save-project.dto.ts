import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   ArrayMaxSize,
   ArrayMinSize,
   IsArray,
   IsBoolean,
   IsEnum,
   IsInt,
   IsOptional,
   IsString,
   Matches,
   Max,
   MaxLength,
   Min,
   ValidateIf,
   ValidateNested,
} from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { EntityStatus, Language } from '@/generated/prisma/enums';

import {
   MAX_COMPANY_LENGTH,
   MAX_PROJECT_LINKS,
   MAX_PROJECT_MEDIA,
   MAX_PROJECT_TAGS,
   MAX_PROJECT_YEAR,
   MAX_ROLE_LENGTH,
   MIN_PROJECT_YEAR,
} from '../project.constants';
import { ProjectLinkDto } from './assign-project-links.dto';

const NullableRequired = () => ValidateIf((_object, value) => value !== null);

export class SaveProjectTranslationDto {
   @ApiProperty({ description: 'Language of the translation', enum: Language })
   @IsEnum(Language)
   language!: Language;

   @ApiProperty({
      description: 'Title. A translation with an empty title is skipped and keeps what is stored',
   })
   @IsString()
   title!: string;

   @ApiProperty({
      type: String,
      description: 'Role on the project, e.g. Frontend developer (empty or null clears it)',
      required: false,
      nullable: true,
      maxLength: MAX_ROLE_LENGTH,
   })
   @IsString()
   @MaxLength(MAX_ROLE_LENGTH)
   @IsOptional()
   role?: string | null;

   @ApiProperty({
      type: String,
      description: 'Short description (rich text, sanitised; null clears it)',
      required: false,
      nullable: true,
   })
   @IsString()
   @IsOptional()
   description?: string | null;

   @ApiProperty({
      type: String,
      description: 'Full content (rich text, sanitised; null clears it)',
      required: false,
      nullable: true,
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

export class SaveProjectMediaItemDto {
   @ApiProperty({
      description: 'ID of an existing media row of this project to keep (omit for a new item)',
      required: false,
   })
   @IsInt()
   @IsOptional()
   id?: number;

   @ApiProperty({ description: 'File to add as a new media row (omit with `id`)', required: false })
   @IsInt()
   @IsOptional()
   fileId?: number;

   @ApiProperty({
      description: 'Language of a new media row (omit with `id`; null or omitted means all)',
      enum: Language,
      required: false,
      nullable: true,
   })
   @IsEnum(Language)
   @IsOptional()
   language?: Language | null;
}

export class SaveProjectDto {
   @ApiProperty({ description: 'URL-friendly slug (lowercase alphanumeric with hyphens)' })
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   slug!: string;

   @ApiProperty({ type: Number, description: 'Thumbnail file ID (null for none)', nullable: true })
   @NullableRequired()
   @IsInt()
   thumbnailId!: number | null;

   @ApiProperty({ description: 'Whether to show this project on the homepage' })
   @IsBoolean()
   showOnHomepage!: boolean;

   @ApiProperty({
      type: String,
      description: 'Company or client the project was made for (empty or null for none)',
      nullable: true,
      maxLength: MAX_COMPANY_LENGTH,
   })
   @NullableRequired()
   @IsString()
   @MaxLength(MAX_COMPANY_LENGTH)
   company!: string | null;

   @ApiProperty({
      type: Number,
      description: 'Year the work started (null for none)',
      nullable: true,
      minimum: MIN_PROJECT_YEAR,
      maximum: MAX_PROJECT_YEAR,
   })
   @NullableRequired()
   @IsInt()
   @Min(MIN_PROJECT_YEAR)
   @Max(MAX_PROJECT_YEAR)
   startYear!: number | null;

   @ApiProperty({
      type: Number,
      description: 'Year the work ended (null when not set or when the project is ongoing)',
      nullable: true,
      minimum: MIN_PROJECT_YEAR,
      maximum: MAX_PROJECT_YEAR,
   })
   @NullableRequired()
   @IsInt()
   @Min(MIN_PROJECT_YEAR)
   @Max(MAX_PROJECT_YEAR)
   endYear!: number | null;

   @ApiProperty({
      description:
         'The project is still running (the web shows startYear to the current year). ' +
         'true requires startYear and endYear null (400 otherwise). Omitted keeps the stored ' +
         'value (false for a new project)',
      required: false,
   })
   @IsBoolean()
   @IsOptional()
   ongoing?: boolean;

   @ApiProperty({
      description:
         'Translations, one per language. Those with a non-empty title are created or replaced; ' +
         'languages not listed (or with an empty title) keep their stored translation. ' +
         'At least one title is required',
      type: [SaveProjectTranslationDto],
      minItems: 1,
   })
   @IsArray()
   @ArrayMinSize(1)
   @ArrayMaxSize(Object.keys(Language).length)
   @ValidateNested({ each: true })
   @Type(() => SaveProjectTranslationDto)
   translations!: SaveProjectTranslationDto[];

   @ApiProperty({
      description: 'Tag IDs in display order (replaces the assigned tags)',
      type: [Number],
      maxItems: MAX_PROJECT_TAGS,
   })
   @IsArray()
   @ArrayMaxSize(MAX_PROJECT_TAGS)
   @IsInt({ each: true })
   tagIds!: number[];

   @ApiProperty({
      description: 'Links in display order, the first one is the main link (replaces the links)',
      type: [ProjectLinkDto],
      maxItems: MAX_PROJECT_LINKS,
   })
   @IsArray()
   @ArrayMaxSize(MAX_PROJECT_LINKS)
   @ValidateNested({ each: true })
   @Type(() => ProjectLinkDto)
   links!: ProjectLinkDto[];

   @ApiProperty({
      description:
         'The complete media list in display order: existing rows to keep (`id`) and new files ' +
         '(`fileId`, `language`). Rows of the project that are not listed are removed',
      type: [SaveProjectMediaItemDto],
      maxItems: MAX_PROJECT_MEDIA,
   })
   @IsArray()
   @ArrayMaxSize(MAX_PROJECT_MEDIA)
   @ValidateNested({ each: true })
   @Type(() => SaveProjectMediaItemDto)
   media!: SaveProjectMediaItemDto[];

   @ApiProperty({
      description:
         'Publication status to set in the same transaction (needs the publish permission). ' +
         'Omit it to keep the current status; a new project is a draft',
      enum: EntityStatus,
      required: false,
   })
   @IsEnum(EntityStatus)
   @IsOptional()
   status?: EntityStatus;

   @ExpectedVersion()
   version?: number;
}
