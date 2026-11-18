import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Language } from '@/generated/prisma/enums';

export class ContactTranslationEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   contactId!: number;

   @ApiProperty({ enum: Language })
   language!: Language;

   @ApiPropertyOptional({ type: String, nullable: true })
   description!: string | null;

   @ApiPropertyOptional({
      type: String,
      nullable: true,
      description: 'Heading of the About section; null = the web uses its default title',
   })
   aboutTitle!: string | null;
}
