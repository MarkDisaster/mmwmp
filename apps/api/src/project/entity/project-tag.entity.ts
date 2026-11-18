import { ApiProperty } from '@nestjs/swagger';

import { TagEntity } from '@/tag/entity/tag.entity';

export class ProjectTagEntity {
   @ApiProperty()
   projectId!: number;

   @ApiProperty()
   tagId!: number;

   @ApiProperty({ type: () => TagEntity })
   tag!: TagEntity;
}
