import { ApiProperty } from '@nestjs/swagger';
import {
   IsBoolean,
   IsInt,
   IsOptional,
   IsString,
   Matches,
   Max,
   MaxLength,
   Min,
} from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { SLUG_MESSAGE, SLUG_REGEX } from '@/common/schema/slug';

import { MAX_COMPANY_LENGTH, MAX_PROJECT_YEAR, MIN_PROJECT_YEAR } from '../project.constants';

export class UpdateProjectDto {
   @ApiProperty({
      description: 'URL-friendly slug (lowercase alphanumeric with hyphens)',
      required: false,
   })
   @Matches(SLUG_REGEX, { message: SLUG_MESSAGE })
   @IsOptional()
   slug?: string;

   @ApiProperty({
      description: 'Company or client the project was made for (null to clear)',
      required: false,
      nullable: true,
   })
   @IsString()
   @MaxLength(MAX_COMPANY_LENGTH)
   @IsOptional()
   company?: string | null;

   @ApiProperty({
      description: 'Year the work started (null to clear)',
      required: false,
      nullable: true,
   })
   @IsInt()
   @Min(MIN_PROJECT_YEAR)
   @Max(MAX_PROJECT_YEAR)
   @IsOptional()
   startYear?: number | null;

   @ApiProperty({
      description: 'Year the work ended (null to clear)',
      required: false,
      nullable: true,
   })
   @IsInt()
   @Min(MIN_PROJECT_YEAR)
   @Max(MAX_PROJECT_YEAR)
   @IsOptional()
   endYear?: number | null;

   @ApiProperty({
      description:
         'The project is still running. true requires a start year and no end year, evaluated ' +
         'on the resulting state: setting an endYear on a running project needs ongoing: false ' +
         'in the same request (400 otherwise). Omitted keeps the stored value',
      required: false,
   })
   @IsBoolean()
   @IsOptional()
   ongoing?: boolean;

   @ApiProperty({ description: 'Whether to show this project on the homepage', required: false })
   @IsBoolean()
   @IsOptional()
   showOnHomepage?: boolean;

   @ApiProperty({
      description: 'Thumbnail file ID (null to remove)',
      required: false,
      nullable: true,
   })
   @IsInt()
   @IsOptional()
   thumbnailId?: number | null;

   @ExpectedVersion()
   version?: number;
}
