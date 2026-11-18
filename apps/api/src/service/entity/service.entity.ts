import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthorEntity } from '@/common/author/author.entity';
import { EntityStatus } from '@/generated/prisma/enums';

import { ServiceProjectEntity } from './service-project.entity';
import { ServiceTranslationEntity } from './service-translation.entity';

export class ServiceEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   title!: string;

   @ApiProperty({ enum: EntityStatus })
   status!: EntityStatus;

   @ApiProperty()
   slug!: string;

   @ApiProperty()
   sortOrder!: number;

   @ApiProperty()
   showOnHomepage!: boolean;

   @ApiProperty({ type: Date, nullable: true })
   publishedAt!: Date | null;

   @ApiProperty()
   createdAt!: Date;

   @ApiProperty()
   updatedAt!: Date;

   @ApiProperty({
      type: 'integer',
      description: 'Raised by every change; send it back as `version` of the next change',
   })
   version!: number;

   @ApiProperty({ type: [ServiceTranslationEntity] })
   translations!: ServiceTranslationEntity[];

   @ApiProperty({ type: [ServiceProjectEntity] })
   projects!: ServiceProjectEntity[];

   @ApiPropertyOptional({ type: () => AuthorEntity, nullable: true })
   createdBy!: AuthorEntity | null;
}
