import type { TFunction } from 'i18next';

import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '@/features/files/constants';
import { isImageMimeType } from '@/utils/file';

export type FileError = 'tooLarge' | 'invalidType' | 'notImage';

export type FileKind = 'image' | 'file';

export const matchesAccept = (mimeType: string, accept?: string[]) =>
   !accept || accept.some((prefix) => mimeType.startsWith(prefix));

export const getFileError = (file: File, accept?: string[]): FileError | null => {
   if (!matchesAccept(file.type, accept)) return 'notImage';
   if (file.size > MAX_FILE_SIZE) return 'tooLarge';
   return null;
};

export const getFileKind = (accept?: string[]): FileKind =>
   accept?.length && accept.every(isImageMimeType) ? 'image' : 'file';

export const toInputAccept = (accept?: string[]): string | undefined =>
   accept?.map((type) => (type.endsWith('/') ? `${type}*` : type)).join(',');

export const getFileErrorMessage = (t: TFunction, error: FileError, kind: FileKind) => ({
   title: t(`files.field.error.${error}.title`),
   detail:
      error === 'tooLarge'
         ? t('files.field.error.tooLarge.detail', { size: MAX_FILE_SIZE_MB })
         : t(`files.field.types.${kind}`),
});
