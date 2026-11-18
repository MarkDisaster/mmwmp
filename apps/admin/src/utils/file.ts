import type { FileEntity } from '@/api/generated';

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export const formatFileSize = (bytes: number, locale: string): string => {
   let value = bytes;
   let unit = 0;
   while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
      value /= 1024;
      unit++;
   }
   return `${new Intl.NumberFormat(locale, {
      maximumFractionDigits: unit === 0 ? 0 : 1,
      useGrouping: false,
   }).format(value)} ${SIZE_UNITS[unit]}`;
};

export const isImageMimeType = (mimeType: string): boolean => mimeType.startsWith('image/');

export const isFileProcessing = (file: Pick<FileEntity, 'processingStatus'>): boolean =>
   file.processingStatus === 'PENDING' || file.processingStatus === 'PROCESSING';

export const getFileDisplayName = (
   file: Pick<FileEntity, 'displayName' | 'originalName'>,
): string => file.displayName || file.originalName;

export const getExtension = (filename: string): string => {
   const dot = filename.lastIndexOf('.');
   return dot > 0 && dot < filename.length - 1 ? filename.slice(dot + 1) : '';
};

export const getNameWithoutExtension = (filename: string): string => {
   const dot = filename.lastIndexOf('.');
   return dot > 0 ? filename.slice(0, dot) : filename;
};

export const getFileTypeLabel = (file: Pick<FileEntity, 'originalName' | 'mimeType'>): string => {
   const subtype = file.mimeType.split('/')[1]?.split('+')[0] ?? '';
   return (getExtension(file.originalName) || subtype).toUpperCase();
};

const findVariantUrl = (file: FileEntity, variant: string): string | undefined =>
   file.variants.find((v) => v.variant === variant)?.publicUrl;

export const getThumbnailUrl = (file: FileEntity): string | null => {
   const thumbnail = findVariantUrl(file, 'thumbnail');
   if (thumbnail) return thumbnail;
   if (isImageMimeType(file.mimeType)) return file.publicUrl;
   return null;
};

export const getMediumUrl = (file: FileEntity): string =>
   findVariantUrl(file, 'medium') ?? file.publicUrl;

export const getLargeUrl = (file: FileEntity): string =>
   findVariantUrl(file, 'large') ?? file.publicUrl;
