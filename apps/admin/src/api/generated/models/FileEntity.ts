/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { FileVariantEntity } from './FileVariantEntity';

export const fileEntityLanguageEnum = {
   cs: 'cs',
   en: 'en',
} as const;

export type FileEntityLanguageEnumKey =
   (typeof fileEntityLanguageEnum)[keyof typeof fileEntityLanguageEnum];

export const fileEntityProcessingStatusEnum = {
   PENDING: 'PENDING',
   PROCESSING: 'PROCESSING',
   READY: 'READY',
   FAILED: 'FAILED',
} as const;

export type FileEntityProcessingStatusEnumKey =
   (typeof fileEntityProcessingStatusEnum)[keyof typeof fileEntityProcessingStatusEnum];

export type FileEntity = {
   id: number;
   filename: string;
   originalName: string;
   displayName: string | null;
   altText: string | null;
   mimeType: string;
   size: number;
   width: number | null;
   height: number | null;
   storagePath: string;
   language: FileEntityLanguageEnumKey | null;
   processingStatus: FileEntityProcessingStatusEnumKey;
   processingError: string | null;
   createdById: number | null;
   createdBy?: AuthorEntity | null;
   createdAt: string;
   version: number;
   deletedAt?: string | null;
   publicUrl: string;
   variants: FileVariantEntity[];
};
