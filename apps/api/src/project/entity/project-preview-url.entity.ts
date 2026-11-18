import { ApiProperty } from '@nestjs/swagger';

export class ProjectPreviewUrlEntity {
   @ApiProperty({ description: 'URL of the web draft mode that opens the project preview' })
   previewUrl!: string;
}
