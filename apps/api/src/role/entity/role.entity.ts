import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuthorEntity } from '@/common/author/author.entity';

export class RolePermissionEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   resource!: string;

   @ApiProperty()
   action!: string;
}

export class RoleEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   name!: string;

   @ApiProperty()
   isSystem!: boolean;

   @ApiProperty()
   isAdmin!: boolean;

   @ApiProperty({ type: [RolePermissionEntity] })
   permissions!: RolePermissionEntity[];

   @ApiProperty()
   createdAt!: string;

   @ApiProperty()
   updatedAt!: string;

   @ApiPropertyOptional({ type: () => AuthorEntity, nullable: true })
   createdBy!: AuthorEntity | null;
}
