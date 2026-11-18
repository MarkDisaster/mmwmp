import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthorEntity } from '@/common/author/author.entity';
import { Language } from '@/generated/prisma/enums';

export class TagTranslationEntity {
   @ApiProperty({ enum: Language })
   language!: Language;

   @ApiProperty({ description: 'Name of the tag in this language' })
   name!: string;
}

export class TagEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({
      type: [TagTranslationEntity],
      description: 'Names of the tag: `cs` always, `en` when it has one (else use `cs`)',
   })
   translations!: TagTranslationEntity[];

   @ApiProperty({ description: 'Language-independent identity of the tag' })
   slug!: string;

   @ApiProperty({ type: String, nullable: true })
   color!: string | null;

   @ApiProperty({ description: 'Display position, lower first' })
   sortOrder!: number;

   @ApiProperty()
   createdAt!: Date;

   @ApiProperty()
   updatedAt!: Date;

   @ApiProperty({
      type: 'integer',
      description: 'Raised by every change; send it back as `version` of the next change',
   })
   version!: number;

   @ApiPropertyOptional({ type: () => AuthorEntity, nullable: true })
   createdBy!: AuthorEntity | null;
}
