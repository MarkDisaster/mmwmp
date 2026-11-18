import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';

import { MAX_ROLE_LENGTH } from '../project.constants';

export class UpsertTranslationDto {
   @ApiProperty({ description: 'Project title' })
   @IsString()
   @IsNotEmpty()
   title!: string;

   @ApiProperty({
      description: 'Role on the project, e.g. Frontend developer (null clears it)',
      required: false,
      nullable: true,
   })
   @IsString()
   @MaxLength(MAX_ROLE_LENGTH)
   @IsOptional()
   role?: string | null;

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

   @ExpectedVersion()
   version?: number;
}
