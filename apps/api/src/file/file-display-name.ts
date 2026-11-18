import type { File } from '@/generated/prisma/client';

export const fileDisplayName = (file: Pick<File, 'displayName' | 'originalName'>): string =>
   file.displayName || file.originalName;

export const normalizeDisplayName = (displayName: string | null | undefined): string | null =>
   displayName?.trim() || null;
