import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '../constants';
import {
   getFileError,
   getFileErrorMessage,
   getFileKind,
   matchesAccept,
   toInputAccept,
} from '../utils/fileValidation';

const PDF = 'application/pdf';

const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'f', { type });

describe('getFileError', () => {
   it('should accept an allowed type within the size limit', () => {
      expect(getFileError(file(PDF))).toBeNull();
      expect(getFileError(file('image/webp', MAX_FILE_SIZE))).toBeNull();
   });

   it('should leave the type to the API', () => {
      expect(getFileError(file('application/x-zip-compressed'))).toBeNull();
      expect(getFileError(file(''))).toBeNull();
      expect(getFileError(file('application/x-msdownload'))).toBeNull();
   });

   it('should refuse a file over the size limit', () => {
      expect(getFileError(file(PDF, MAX_FILE_SIZE + 1))).toBe('tooLarge');
   });

   it('should refuse an allowed type that is not an image when only images are accepted', () => {
      expect(getFileError(file(PDF), ['image/'])).toBe('notImage');
      expect(getFileError(file('image/png'), ['image/'])).toBeNull();
   });
});

describe('matchesAccept', () => {
   it('should match any type without accepted prefixes', () => {
      expect(matchesAccept(PDF)).toBe(true);
   });

   it('should match a type that starts with one of the prefixes', () => {
      expect(matchesAccept('image/png', ['image/'])).toBe(true);
      expect(matchesAccept('video/mp4', ['image/', 'video/'])).toBe(true);
      expect(matchesAccept(PDF, ['image/'])).toBe(false);
   });
});

describe('getFileKind', () => {
   it('should talk about images only when every accepted prefix is an image type', () => {
      expect(getFileKind(['image/'])).toBe('image');
      expect(getFileKind(['image/png', 'image/webp'])).toBe('image');
   });

   it('should talk about files otherwise', () => {
      expect(getFileKind()).toBe('file');
      expect(getFileKind([])).toBe('file');
      expect(getFileKind(['image/', PDF])).toBe('file');
      expect(getFileKind(['video/'])).toBe('file');
   });
});

describe('toInputAccept', () => {
   it('should turn a type prefix into a wildcard and keep full types', () => {
      expect(toInputAccept(['image/'])).toBe('image/*');
      expect(toInputAccept(['image/', PDF])).toBe(`image/*,${PDF}`);
   });

   it('should leave the attribute out without accepted types', () => {
      expect(toInputAccept()).toBeUndefined();
   });
});

describe('getFileErrorMessage', () => {
   const t = ((key: string, options?: { size?: number }) =>
      options?.size === undefined ? key : `${key}:${options.size}`) as unknown as TFunction;

   it('should give the size limit for a file that is too large', () => {
      expect(getFileErrorMessage(t, 'tooLarge', 'image')).toEqual({
         title: 'files.field.error.tooLarge.title',
         detail: `files.field.error.tooLarge.detail:${MAX_FILE_SIZE_MB}`,
      });
   });

   it('should list the supported types of the kind for a refused type', () => {
      expect(getFileErrorMessage(t, 'notImage', 'image')).toEqual({
         title: 'files.field.error.notImage.title',
         detail: 'files.field.types.image',
      });
      expect(getFileErrorMessage(t, 'invalidType', 'file').detail).toBe('files.field.types.file');
   });
});
