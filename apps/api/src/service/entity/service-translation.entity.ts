import { ApiProperty } from '@nestjs/swagger';

import { Language } from '@/generated/prisma/enums';

export class ServiceTranslationEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   serviceId!: number;

   @ApiProperty({ enum: Language })
   language!: Language;

   @ApiProperty()
   title!: string;

   @ApiProperty({ type: String, nullable: true, required: false })
   description!: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   content!: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   metaTitle!: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   metaDescription!: string | null;
}
