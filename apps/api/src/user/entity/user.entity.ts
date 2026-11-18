import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { RoleEntity } from '@/role/entity/role.entity';

export class UserEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   email!: string;

   @ApiProperty()
   firstName!: string;

   @ApiProperty()
   lastName!: string;

   @ApiPropertyOptional({ type: String, nullable: true })
   avatarUrl!: string | null;

   @ApiProperty({ type: () => RoleEntity })
   role!: RoleEntity;

   @ApiProperty({ type: String, nullable: true, required: false })
   deletedAt!: string | null;

   @ApiProperty({
      type: String,
      nullable: true,
      required: false,
      description: 'When the account was deactivated (cannot sign in), null when active',
   })
   deactivatedAt!: string | null;

   @ApiProperty({ type: Number, nullable: true, required: false })
   deactivatedById!: number | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   invitedAt!: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   acceptedInvitationAt!: string | null;

   @ApiProperty()
   createdAt!: string;

   @ApiProperty()
   updatedAt!: string;
}
