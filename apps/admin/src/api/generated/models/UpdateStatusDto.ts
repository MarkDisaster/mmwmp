/* eslint-disable */

export const updateStatusDtoStatusEnum = {
   draft: 'draft',
   published: 'published',
} as const;

export type UpdateStatusDtoStatusEnumKey =
   (typeof updateStatusDtoStatusEnum)[keyof typeof updateStatusDtoStatusEnum];

export type UpdateStatusDto = {
   status: UpdateStatusDtoStatusEnumKey;
   version?: number;
};
