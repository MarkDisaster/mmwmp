import { describe, expect, it } from 'vitest';

import type { FileEntity } from '@/api/generated';

import {
   formatFileSize,
   getExtension,
   getFileDisplayName,
   getFileTypeLabel,
   getLargeUrl,
   getMediumUrl,
   getNameWithoutExtension,
   getThumbnailUrl,
   isFileProcessing,
   isImageMimeType,
} from '../file';

describe('formatFileSize', () => {
   it('should use a decimal comma in Czech and a point in English', () => {
      expect(formatFileSize(5000, 'cs')).toBe('4,9 KB');
      expect(formatFileSize(5000, 'en')).toBe('4.9 KB');
      expect(formatFileSize(1_300_000, 'cs')).toBe('1,2 MB');
   });

   it('should show bytes without decimals and pick the unit by size', () => {
      expect(formatFileSize(0, 'cs')).toBe('0 B');
      expect(formatFileSize(1023, 'en')).toBe('1023 B');
      expect(formatFileSize(1024, 'en')).toBe('1 KB');
      expect(formatFileSize(10 * 1024 * 1024, 'cs')).toBe('10 MB');
      expect(formatFileSize(3 * 1024 ** 3, 'en')).toBe('3 GB');
   });
});

const ORIGINAL_URL = 'https://cdn.test/original.png';

const makeFile = (mimeType: string, variants: Record<string, string> = {}) =>
   ({
      mimeType,
      publicUrl: ORIGINAL_URL,
      variants: Object.entries(variants).map(([variant, publicUrl]) => ({ variant, publicUrl })),
   }) as unknown as FileEntity;

describe('image variant urls', () => {
   it('uses the stored variant and falls back to the original', () => {
      const withVariants = makeFile('image/png', {
         thumbnail: 'https://cdn.test/t.webp',
         medium: 'https://cdn.test/m.webp',
         large: 'https://cdn.test/l.webp',
      });
      const withoutVariants = makeFile('image/png');

      expect(getThumbnailUrl(withVariants)).toBe('https://cdn.test/t.webp');
      expect(getMediumUrl(withVariants)).toBe('https://cdn.test/m.webp');
      expect(getLargeUrl(withVariants)).toBe('https://cdn.test/l.webp');
      expect(getThumbnailUrl(withoutVariants)).toBe(ORIGINAL_URL);
      expect(getMediumUrl(withoutVariants)).toBe(ORIGINAL_URL);
      expect(getLargeUrl(withoutVariants)).toBe(ORIGINAL_URL);
   });

   it('has no thumbnail for a file that is not an image', () => {
      expect(getThumbnailUrl(makeFile('application/pdf'))).toBeNull();
   });
});

describe('isImageMimeType', () => {
   it('should match only the image types', () => {
      expect(isImageMimeType('image/png')).toBe(true);
      expect(isImageMimeType('image/svg+xml')).toBe(true);
      expect(isImageMimeType('application/pdf')).toBe(false);
      expect(isImageMimeType('')).toBe(false);
   });
});

describe('isFileProcessing', () => {
   it('should be true until the worker has finished with the file', () => {
      expect(isFileProcessing({ processingStatus: 'PENDING' })).toBe(true);
      expect(isFileProcessing({ processingStatus: 'PROCESSING' })).toBe(true);
      expect(isFileProcessing({ processingStatus: 'READY' })).toBe(false);
      expect(isFileProcessing({ processingStatus: 'FAILED' })).toBe(false);
   });
});

describe('getFileDisplayName', () => {
   it('should prefer the name given in the admin', () => {
      expect(getFileDisplayName({ displayName: 'Logo', originalName: 'logo.png' })).toBe('Logo');
      expect(getFileDisplayName({ displayName: null, originalName: 'logo.png' })).toBe('logo.png');
   });

   it('should take the uploaded name for an empty name, as the API does', () => {
      expect(getFileDisplayName({ displayName: '', originalName: 'logo.png' })).toBe('logo.png');
   });
});

describe('getExtension', () => {
   it('should return the part after the last dot', () => {
      expect(getExtension('report.pdf')).toBe('pdf');
      expect(getExtension('archive.tar.gz')).toBe('gz');
   });

   it('should return nothing for a name without an extension', () => {
      expect(getExtension('README')).toBe('');
      expect(getExtension('.env')).toBe('');
      expect(getExtension('report.')).toBe('');
   });
});

describe('getNameWithoutExtension', () => {
   it('should strip only the last extension', () => {
      expect(getNameWithoutExtension('report.pdf')).toBe('report');
      expect(getNameWithoutExtension('archive.tar.gz')).toBe('archive.tar');
   });

   it('should keep a name without an extension or starting with a dot', () => {
      expect(getNameWithoutExtension('README')).toBe('README');
      expect(getNameWithoutExtension('.env')).toBe('.env');
   });
});

describe('getFileTypeLabel', () => {
   it('should use the extension in upper case', () => {
      expect(getFileTypeLabel({ originalName: 'cv.docx', mimeType: 'application/msword' })).toBe(
         'DOCX',
      );
   });

   it('should fall back to the MIME subtype without its suffix', () => {
      expect(getFileTypeLabel({ originalName: 'logo', mimeType: 'image/svg+xml' })).toBe('SVG');
      expect(getFileTypeLabel({ originalName: 'photo', mimeType: 'image/jpeg' })).toBe('JPEG');
      expect(getFileTypeLabel({ originalName: 'blob', mimeType: '' })).toBe('');
   });
});
