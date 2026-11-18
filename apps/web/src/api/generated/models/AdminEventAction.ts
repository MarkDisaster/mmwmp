/* eslint-disable */

export const adminEventActionEnum = {
   created: 'created',
   updated: 'updated',
   deleted: 'deleted',
   restored: 'restored',
   moved: 'moved',
} as const;

export type AdminEventActionEnumKey =
   (typeof adminEventActionEnum)[keyof typeof adminEventActionEnum];

export type AdminEventAction = AdminEventActionEnumKey;
