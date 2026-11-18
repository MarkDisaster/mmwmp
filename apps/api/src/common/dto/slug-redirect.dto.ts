import { ApiProperty } from '@nestjs/swagger';

export class SlugRedirectEntity {
   @ApiProperty({ description: 'The current slug of the record the old slug belonged to' })
   slug!: string;
}
