import { ApiProperty } from '@nestjs/swagger';

export class GenerateServiceTranslationResponseDto {
   @ApiProperty()
   title!: string;

   @ApiProperty({ type: String, nullable: true })
   description!: string | null;

   @ApiProperty({ type: String, nullable: true })
   content!: string | null;
}
