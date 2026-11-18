import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';
import { Language } from '@/generated/prisma/enums';

export class CreateServiceDto {
   @ApiProperty({ description: 'Service title' })
   @IsString()
   @IsNotEmpty()
   title!: string;

   @ApiProperty({ description: 'URL-friendly slug (lowercase alphanumeric with hyphens)' })
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   slug!: string;

   @ApiProperty({ description: 'Primary language', enum: Language })
   @IsEnum(Language)
   language!: Language;

   @ApiProperty({ description: 'Short description', required: false })
   @IsString()
   @IsOptional()
   description?: string;

   @ApiProperty({ description: 'Rich text content', required: false })
   @IsString()
   @IsOptional()
   content?: string;
}
