/* eslint-disable */

export const fileVariantEntityVariantEnum = {
   thumbnail: 'thumbnail',
   medium: 'medium',
   large: 'large',
   original: 'original',
} as const;

export type FileVariantEntityVariantEnumKey =
   (typeof fileVariantEntityVariantEnum)[keyof typeof fileVariantEntityVariantEnum];

export type FileVariantEntity = {
   id: number;
   variant: FileVariantEntityVariantEnumKey;
   storagePath: string;
   mimeType: string;
   size: number;
   width: number | null;
   height: number | null;
   publicUrl: string;
};
