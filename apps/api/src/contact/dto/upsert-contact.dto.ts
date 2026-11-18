import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   IsArray,
   IsBoolean,
   IsEmail,
   IsOptional,
   IsString,
   ValidateIf,
   ValidateNested,
} from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { IsHttpUrl } from '@/common/decorators/is-http-url.decorator';

import { UpsertContactTranslationDto } from './upsert-contact-translation.dto';

export class UpsertContactDto {
   @ApiProperty({ description: 'Company name', required: false })
   @IsString()
   @IsOptional()
   companyName?: string | null;

   @ApiProperty({ description: 'Phone number', required: false })
   @IsString()
   @IsOptional()
   phone?: string | null;

   @ApiProperty({ description: 'Email address', required: false })
   @IsEmail()
   @IsOptional()
   email?: string | null;

   @ApiProperty({ description: 'Street address', required: false })
   @IsString()
   @IsOptional()
   street?: string | null;

   @ApiProperty({ description: 'ZIP / postal code', required: false })
   @IsString()
   @IsOptional()
   zip?: string | null;

   @ApiProperty({ description: 'City', required: false })
   @IsString()
   @IsOptional()
   city?: string | null;

   @ApiProperty({ description: 'Company registration number (IČO)', required: false })
   @IsString()
   @IsOptional()
   ico?: string | null;

   @ApiProperty({ description: 'VAT payer flag', required: false, default: false })
   @IsBoolean()
   @ValidateIf((_dto, value) => value !== undefined)
   vatPayer?: boolean;

   @ApiProperty({ description: 'LinkedIn profile URL', required: false })
   @IsHttpUrl()
   @IsOptional()
   linkedinUrl?: string | null;

   @ApiProperty({ description: 'GitHub profile URL', required: false })
   @IsHttpUrl()
   @IsOptional()
   githubUrl?: string | null;

   @ApiProperty({ type: [UpsertContactTranslationDto], required: false })
   @IsArray()
   @ValidateNested({ each: true })
   @Type(() => UpsertContactTranslationDto)
   @IsOptional()
   translations?: UpsertContactTranslationDto[];

   @ExpectedVersion()
   version?: number;
}
