import type { PublicProjectEntity } from '@/api/generated/models/PublicProjectEntity';

export const resolveProjectThumbnailUrl = (project: PublicProjectEntity): string | undefined =>
   project.thumbnail?.variants?.find((v) => v.variant === 'large')?.publicUrl ??
   project.thumbnail?.variants?.[0]?.publicUrl;

export const resolveProjectThumbnailAlt = (
   project: PublicProjectEntity,
   fallback: string,
): string =>
   project.thumbnail?.altText?.trim() || project.thumbnail?.displayName?.trim() || fallback;
