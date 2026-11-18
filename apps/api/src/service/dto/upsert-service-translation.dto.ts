import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';

export class UpsertServiceTranslationDto {
   @ApiProperty({ description: 'Service title' })
   @IsString()
   @IsNotEmpty()
   title!: string;

   @ApiProperty({ description: 'Short description', required: false })
   @IsString()
   @IsOptional()
   description?: string;

   @ApiProperty({ description: 'Rich text content', required: false })
   @IsString()
   @IsOptional()
   content?: string;

   @ApiProperty({ description: 'SEO meta title', required: false })
   @IsString()
   @ValidateIf((_, value) => value !== undefined)
   metaTitle?: string;

   @ApiProperty({ description: 'SEO meta description', required: false })
   @IsString()
   @ValidateIf((_, value) => value !== undefined)
   metaDescription?: string;

   @ExpectedVersion()
   version?: number;
}
