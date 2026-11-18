import { ApiProperty } from '@nestjs/swagger';

export class ConversationEntity {
   @ApiProperty()
   id!: string;

   @ApiProperty()
   userId!: number;

   @ApiProperty({ type: String, nullable: true })
   title!: string | null;

   @ApiProperty()
   createdAt!: Date;

   @ApiProperty()
   updatedAt!: Date;
}
