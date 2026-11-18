/* eslint-disable */

export const adminSlugRedirectEntityTargetStateEnum = {
   published: 'published',
   draft: 'draft',
   trashed: 'trashed',
   missing: 'missing',
} as const;

export type AdminSlugRedirectEntityTargetStateEnumKey =
   (typeof adminSlugRedirectEntityTargetStateEnum)[keyof typeof adminSlugRedirectEntityTargetStateEnum];

export type AdminSlugRedirectEntity = {
   id: number;
   oldSlug: string;
   targetId: number;
   targetTitle: string | null;
   targetSlug: string | null;
   targetState: AdminSlugRedirectEntityTargetStateEnumKey;
   createdAt: string;
};
