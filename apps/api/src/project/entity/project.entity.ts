import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthorEntity } from '@/common/author/author.entity';
import { FileEntity } from '@/file/entity/file.entity';
import { EntityStatus } from '@/generated/prisma/enums';

import { ProjectLinkEntity } from './project-link.entity';
import { ProjectMediaEntity } from './project-media.entity';
import { ProjectTagEntity } from './project-tag.entity';
import { ProjectTranslationEntity } from './project-translation.entity';

export class ProjectEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   title!: string;

   @ApiProperty({ enum: EntityStatus })
   status!: EntityStatus;

   @ApiProperty({ type: String, nullable: true })
   company!: string | null;

   @ApiProperty({ type: Number, nullable: true })
   startYear!: number | null;

   @ApiProperty({
      type: Number,
      nullable: true,
      description: 'Year the work ended. Null when it is not set or the project is ongoing',
   })
   endYear!: number | null;

   @ApiProperty({
      description:
         'The project is still running: the web shows startYear to the current year. ' +
         'Requires startYear and no endYear',
   })
   ongoing!: boolean;

   @ApiProperty()
   slug!: string;

   @ApiProperty({ type: Number, nullable: true })
   thumbnailId!: number | null;

   @ApiProperty({ type: () => FileEntity, nullable: true, required: false })
   thumbnail!: FileEntity | null;

   @ApiProperty({ type: Number, nullable: true })
   createdById!: number | null;

   @ApiPropertyOptional({ type: () => AuthorEntity, nullable: true })
   createdBy!: AuthorEntity | null;

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

   @ApiProperty({ type: [ProjectTranslationEntity] })
   translations!: ProjectTranslationEntity[];

   @ApiProperty({ type: [ProjectTagEntity] })
   tags!: ProjectTagEntity[];

   @ApiProperty({
      type: [ProjectLinkEntity],
      description: 'Links in display order; the first one is the main project link',
   })
   links!: ProjectLinkEntity[];

   @ApiProperty({ type: [ProjectMediaEntity] })
   media!: ProjectMediaEntity[];
}
