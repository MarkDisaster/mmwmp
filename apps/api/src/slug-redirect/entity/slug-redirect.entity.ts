import { ApiProperty } from '@nestjs/swagger';

export class AdminSlugRedirectEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({ description: 'The former slug that still answers with a permanent redirect' })
   oldSlug!: string;

   @ApiProperty({ description: 'Id of the project or service the old slug redirects to' })
   targetId!: number;

   @ApiProperty({ type: String, nullable: true, description: 'Current title of the target' })
   targetTitle!: string | null;

   @ApiProperty({ type: String, nullable: true, description: 'Current slug of the target' })
   targetSlug!: string | null;

   @ApiProperty({
      enum: ['published', 'draft', 'trashed', 'missing'],
      description:
         'Only a published target is redirected to; every other state answers 404 like an unknown slug',
   })
   targetState!: 'published' | 'draft' | 'trashed' | 'missing';

   @ApiProperty()
   createdAt!: Date;
}
