import { ApiProperty } from '@nestjs/swagger';

import { Language } from '@/generated/prisma/enums';

export class ProjectMediaEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   projectId!: number;

   @ApiProperty()
   fileId!: number;

   @ApiProperty({ enum: Language, nullable: true })
   language!: Language | null;

   @ApiProperty()
   sortOrder!: number;
}
