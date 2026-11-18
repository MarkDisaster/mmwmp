import { ALLOWED_FILE_TYPES } from '../allowed-file-types';

describe('ALLOWED_FILE_TYPES', () => {
   it.each([
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf',
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'video/mp4',
      'video/webm',
   ])('accepts %s', (type) => {
      expect(ALLOWED_FILE_TYPES.test(type)).toBe(true);
   });

   it.each([
      'image/svg+xml',
      'text/html',
      'text/plain',
      'application/msword',
      'application/xhtml+xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document.x',
      '',
   ])('rejects "%s"', (type) => {
      expect(ALLOWED_FILE_TYPES.test(type)).toBe(false);
   });
});
