import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseEntity {
   @ApiProperty()
   accessToken!: string;

   @ApiProperty()
   refreshToken!: string;

   @ApiProperty({ description: 'Access token expiration timestamp (ISO 8601)' })
   expiresAt!: string;
}
