/* eslint-disable */

import type { PublicFileEntity } from './PublicFileEntity';

export const publicProjectMediaEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type PublicProjectMediaEntityLanguageEnumKey =
   (typeof publicProjectMediaEntityLanguageEnum)[keyof typeof publicProjectMediaEntityLanguageEnum];

export type PublicProjectMediaEntity = {
   id: number;
   projectId: number;
   fileId: number;
   language: PublicProjectMediaEntityLanguageEnumKey | null;
   sortOrder: number;
   file: PublicFileEntity;
};
