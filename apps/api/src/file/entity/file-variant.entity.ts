import { ApiProperty } from '@nestjs/swagger';

import { FileVariantType } from '@/generated/prisma/enums';

export class FileVariantEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({ enum: FileVariantType })
   variant!: FileVariantType;

   @ApiProperty()
   storagePath!: string;

   @ApiProperty()
   mimeType!: string;

   @ApiProperty()
   size!: number;

   @ApiProperty({ type: Number, nullable: true })
   width!: number | null;

   @ApiProperty({ type: Number, nullable: true })
   height!: number | null;

   @ApiProperty()
   publicUrl!: string;
}
