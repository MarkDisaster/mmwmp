import { BadRequestException, type PipeTransform } from '@nestjs/common';

import { ALLOWED_FILE_TYPES } from '../allowed-file-types';
import { detectFileType } from '../detect-file-type';

export type DetectedFile = Express.Multer.File & { detectedMimeType: string };

export class DetectedFileTypePipe implements PipeTransform<
   Express.Multer.File,
   Promise<DetectedFile>
> {
   async transform(file: Express.Multer.File): Promise<DetectedFile> {
      const detectedMimeType = file?.buffer ? await detectFileType(file.buffer) : undefined;
      if (!detectedMimeType || !ALLOWED_FILE_TYPES.test(detectedMimeType)) {
         throw new BadRequestException('Validation failed (file type is not allowed)');
      }
      return Object.assign(file, { detectedMimeType });
   }
}
