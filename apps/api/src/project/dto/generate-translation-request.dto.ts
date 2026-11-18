import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GenerateProjectTranslationRequestDto {
   @ApiProperty()
   @IsString()
   title!: string;

   @ApiProperty({ type: String, nullable: true, required: false })
   @IsOptional()
   @IsString()
   description?: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   @IsOptional()
   @IsString()
   content?: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   @IsOptional()
   @IsString()
   metaTitle?: string | null;

   @ApiProperty({ type: String, nullable: true, required: false })
   @IsOptional()
   @IsString()
   metaDescription?: string | null;
}
