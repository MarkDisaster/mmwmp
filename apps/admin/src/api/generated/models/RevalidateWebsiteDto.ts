/* eslint-disable */

export const revalidateWebsiteDtoTagsEnum = {
   services: 'services',
   projects: 'projects',
   contact: 'contact',
   tags: 'tags',
} as const;

export type RevalidateWebsiteDtoTagsEnumKey =
   (typeof revalidateWebsiteDtoTagsEnum)[keyof typeof revalidateWebsiteDtoTagsEnum];

export type RevalidateWebsiteDto = {
   tags: RevalidateWebsiteDtoTagsEnumKey[];
};
