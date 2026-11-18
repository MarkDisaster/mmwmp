/* eslint-disable */

import type { PublicFileVariantEntity } from './PublicFileVariantEntity';

export const publicFileEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type PublicFileEntityLanguageEnumKey =
   (typeof publicFileEntityLanguageEnum)[keyof typeof publicFileEntityLanguageEnum];

export type PublicFileEntity = {
   id: number;
   displayName: string | null;
   altText: string | null;
   mimeType: string;
   width: number | null;
   height: number | null;
   language: PublicFileEntityLanguageEnumKey | null;
   variants: PublicFileVariantEntity[];
};
