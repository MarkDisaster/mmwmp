import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { Language } from '@/generated/prisma/enums';

import { MAX_ROLE_LENGTH } from '../project.constants';

export class CreateProjectDto {
   @ApiProperty({ description: 'Project title' })
   @IsString()
   @IsNotEmpty()
   title!: string;

   @ApiProperty({ description: 'URL-friendly slug (lowercase alphanumeric with hyphens)' })
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   slug!: string;

   @ApiProperty({ description: 'Primary language', enum: Language })
   @IsEnum(Language)
   language!: Language;

   @ApiProperty({ description: 'Role on the project, e.g. Frontend developer', required: false })
   @IsString()
   @MaxLength(MAX_ROLE_LENGTH)
   @IsOptional()
   role?: string;

   @ApiProperty({ description: 'Short description', required: false })
   @IsString()
   @IsOptional()
   description?: string;

   @ApiProperty({ description: 'Full content (HTML/Markdown)', required: false })
   @IsString()
   @IsOptional()
   content?: string;

   @ApiProperty({ description: 'SEO meta title', required: false })
   @IsString()
   @IsOptional()
   metaTitle?: string;

   @ApiProperty({ description: 'SEO meta description', required: false })
   @IsString()
   @IsOptional()
   metaDescription?: string;
}
