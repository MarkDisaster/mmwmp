import { ApiProperty } from '@nestjs/swagger';

export class GenerateProjectTranslationResponseDto {
   @ApiProperty()
   title!: string;

   @ApiProperty({ type: String, nullable: true })
   description!: string | null;

   @ApiProperty({ type: String, nullable: true })
   content!: string | null;

   @ApiProperty({ type: String, nullable: true })
   metaTitle!: string | null;

   @ApiProperty({ type: String, nullable: true })
   metaDescription!: string | null;
}
