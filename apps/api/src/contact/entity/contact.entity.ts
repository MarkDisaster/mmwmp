import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ContactTranslationEntity } from './contact-translation.entity';

export class ContactEntity {
   @ApiProperty()
   id!: number;

   @ApiPropertyOptional({ type: String, nullable: true })
   companyName!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   phone!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   email!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   street!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   zip!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   city!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   ico!: string | null;

   @ApiProperty()
   vatPayer!: boolean;

   @ApiPropertyOptional({ type: String, nullable: true })
   linkedinUrl!: string | null;

   @ApiPropertyOptional({ type: String, nullable: true })
   githubUrl!: string | null;

   @ApiProperty({ type: [ContactTranslationEntity] })
   translations!: ContactTranslationEntity[];

   @ApiProperty()
   createdAt!: string;

   @ApiProperty()
   updatedAt!: string;

   @ApiProperty({
      type: 'integer',
      description: 'Raised by every change; send it back as `version` of the next change',
   })
   version!: number;
}
