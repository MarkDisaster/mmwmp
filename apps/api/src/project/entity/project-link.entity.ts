import { ApiProperty } from '@nestjs/swagger';

export class ProjectLinkEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   projectId!: number;

   @ApiProperty({ type: String, nullable: true })
   label!: string | null;

   @ApiProperty()
   url!: string;

   @ApiProperty()
   sortOrder!: number;
}
