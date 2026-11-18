/* eslint-disable */

export const editLockEntityEnum = {
   projects: 'projects',
   services: 'services',
   tags: 'tags',
   files: 'files',
   contact: 'contact',
} as const;

export type EditLockEntityEnumKey = (typeof editLockEntityEnum)[keyof typeof editLockEntityEnum];

export type EditLockEntity = EditLockEntityEnumKey;
