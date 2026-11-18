import { ApiProperty } from '@nestjs/swagger';

export class ServiceProjectTranslationEntity {
   @ApiProperty()
   language!: string;

   @ApiProperty()
   title!: string;
}

export class ServiceProjectItemEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   slug!: string;

   @ApiProperty({ type: [ServiceProjectTranslationEntity] })
   translations!: ServiceProjectTranslationEntity[];
}

export class ServiceProjectEntity {
   @ApiProperty()
   serviceId!: number;

   @ApiProperty()
   projectId!: number;

   @ApiProperty()
   sortOrder!: number;

   @ApiProperty({ type: ServiceProjectItemEntity })
   project!: ServiceProjectItemEntity;
}
