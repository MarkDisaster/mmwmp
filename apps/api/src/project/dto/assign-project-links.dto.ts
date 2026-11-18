import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
   ArrayMaxSize,
   IsArray,
   IsOptional,
   IsString,
   MaxLength,
   ValidateNested,
} from 'class-validator';

import { ExpectedVersion } from '@/common/decorators/expected-version.decorator';
import { IsHttpUrl, MAX_URL_LENGTH } from '@/common/decorators/is-http-url.decorator';

import { MAX_LINK_LABEL_LENGTH, MAX_PROJECT_LINKS } from '../project.constants';

export class ProjectLinkDto {
   @ApiProperty({
      description: 'Link label, e.g. GitHub (the web falls back to the domain when empty)',
      required: false,
      nullable: true,
   })
   @IsString()
   @MaxLength(MAX_LINK_LABEL_LENGTH)
   @IsOptional()
   label?: string | null;

   @ApiProperty({ description: 'Link URL', maxLength: MAX_URL_LENGTH })
   @IsHttpUrl()
   url!: string;
}

export class AssignProjectLinksDto {
   @ApiProperty({
      description:
         'Links in display order, the first one is the main project link (replaces the existing ones)',
      type: [ProjectLinkDto],
      maxItems: MAX_PROJECT_LINKS,
   })
   @IsArray()
   @ArrayMaxSize(MAX_PROJECT_LINKS)
   @ValidateNested({ each: true })
   @Type(() => ProjectLinkDto)
   links!: ProjectLinkDto[];

   @ExpectedVersion()
   version?: number;
}
