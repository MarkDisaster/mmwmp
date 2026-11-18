import type { FileInterceptor } from '@nestjs/platform-express';

type MulterOptions = NonNullable<Parameters<typeof FileInterceptor>[1]>;

export const FILE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const AVATAR_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

export const AUDIO_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export const singleFileUpload = (maxFileSize: number): MulterOptions => ({
   limits: {
      fileSize: maxFileSize,
      files: 1,
      fields: 10,
      fieldSize: 64 * 1024,
      parts: 11,
   },
});
