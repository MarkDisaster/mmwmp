import { ApiProperty, PickType } from '@nestjs/swagger';

import { Language } from '@/generated/prisma/enums';

import { FileVariantEntity } from './file-variant.entity';

export class PublicFileVariantEntity extends PickType(FileVariantEntity, [
   'id',
   'variant',
   'mimeType',
   'width',
   'height',
   'publicUrl',
] as const) {}

export class PublicFileEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({ type: String, nullable: true })
   displayName!: string | null;

   @ApiProperty({
      type: String,
      nullable: true,
      description: 'Description of the image in the language of the file (the `alt` attribute)',
   })
   altText!: string | null;

   @ApiProperty()
   mimeType!: string;

   @ApiProperty({ type: Number, nullable: true })
   width!: number | null;

   @ApiProperty({ type: Number, nullable: true })
   height!: number | null;

   @ApiProperty({ enum: Language, nullable: true })
   language!: Language | null;

   @ApiProperty({ type: [PublicFileVariantEntity] })
   variants!: PublicFileVariantEntity[];
}
