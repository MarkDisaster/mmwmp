import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthorEntity } from '@/common/author/author.entity';
import { FileProcessingStatus, Language } from '@/generated/prisma/enums';

import { FileVariantEntity } from './file-variant.entity';

export class FileEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   filename!: string;

   @ApiProperty()
   originalName!: string;

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

   @ApiProperty()
   size!: number;

   @ApiProperty({ type: Number, nullable: true })
   width!: number | null;

   @ApiProperty({ type: Number, nullable: true })
   height!: number | null;

   @ApiProperty()
   storagePath!: string;

   @ApiProperty({ nullable: true, enum: Language })
   language!: Language | null;

   @ApiProperty({ enum: FileProcessingStatus })
   processingStatus!: FileProcessingStatus;

   @ApiProperty({ type: String, nullable: true })
   processingError!: string | null;

   @ApiProperty({ type: Number, nullable: true })
   createdById!: number | null;

   @ApiPropertyOptional({ type: () => AuthorEntity, nullable: true })
   createdBy?: AuthorEntity | null;

   @ApiProperty()
   createdAt!: string;

   @ApiProperty({
      type: 'integer',
      description: 'Raised by every change; send it back as `version` of the next change',
   })
   version!: number;

   @ApiPropertyOptional({
      type: String,
      nullable: true,
      description:
         'Set when the file is in the trash. Only a project detail can show such a file (the ' +
         'project keeps its reference); the library and the public endpoints leave it out.',
   })
   deletedAt?: string | null;

   @ApiProperty()
   publicUrl!: string;

   @ApiProperty({ type: [FileVariantEntity] })
   variants!: FileVariantEntity[];
}
