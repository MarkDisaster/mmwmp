import { ApiProperty, OmitType } from '@nestjs/swagger';

import { PublicFileEntity } from '@/file/entity/public-file.entity';
import { PublicTagEntity } from '@/tag/entity/public-tag.entity';

import { ProjectEntity } from './project.entity';
import { ProjectMediaEntity } from './project-media.entity';
import { ProjectTagEntity } from './project-tag.entity';

export class PublicProjectMediaEntity extends ProjectMediaEntity {
   @ApiProperty({ type: () => PublicFileEntity })
   file!: PublicFileEntity;
}

export class PublicProjectTagEntity extends OmitType(ProjectTagEntity, ['tag'] as const) {
   @ApiProperty({ type: () => PublicTagEntity })
   tag!: PublicTagEntity;
}

export class PublicProjectEntity extends OmitType(ProjectEntity, [
   'createdById',
   'createdBy',
   'thumbnail',
   'media',
   'tags',
   'version',
] as const) {
   @ApiProperty({ type: [PublicProjectTagEntity] })
   tags!: PublicProjectTagEntity[];

   @ApiProperty({ type: () => PublicFileEntity, nullable: true })
   thumbnail!: PublicFileEntity | null;

   @ApiProperty({ type: [PublicProjectMediaEntity] })
   media!: PublicProjectMediaEntity[];
}
