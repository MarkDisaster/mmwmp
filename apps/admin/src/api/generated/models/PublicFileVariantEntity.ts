/* eslint-disable */

export const publicFileVariantEntityVariantEnum = {
   thumbnail: 'thumbnail',
   medium: 'medium',
   large: 'large',
   original: 'original',
} as const;

export type PublicFileVariantEntityVariantEnumKey =
   (typeof publicFileVariantEntityVariantEnum)[keyof typeof publicFileVariantEntityVariantEnum];

export type PublicFileVariantEntity = {
   id: number;
   variant: PublicFileVariantEntityVariantEnumKey;
   mimeType: string;
   width: number | null;
   height: number | null;
   publicUrl: string;
};
