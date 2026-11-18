import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty()
   firstName!: string;

   @ApiProperty()
   lastName!: string;

   @ApiPropertyOptional({
      description: 'Sent only to a caller with the `users.read` permission, or to the author.',
   })
   email?: string;
}
