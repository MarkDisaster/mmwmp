import { ApiProperty } from '@nestjs/swagger';

import { AuthorEntity } from '@/common/author/author.entity';

export class TrashedItemEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({ description: 'Title, name or file name' })
   title!: string;

   @ApiProperty({ type: String, nullable: true, description: 'Slug before the row was trashed' })
   originalSlug!: string | null;

   @ApiProperty()
   deletedAt!: Date;

   @ApiProperty({ type: () => AuthorEntity, nullable: true })
   deletedBy!: AuthorEntity | null;

   @ApiProperty({ description: 'Days left before the automatic purge (0 when it is due)' })
   daysLeft!: number;
}
