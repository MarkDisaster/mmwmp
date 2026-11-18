/* eslint-disable */

export const permissionDtoResourceEnum = {
   projects: 'projects',
   services: 'services',
   tags: 'tags',
   files: 'files',
   users: 'users',
   roles: 'roles',
   contact: 'contact',
   audit_logs: 'audit_logs',
   runner_scores: 'runner_scores',
} as const;

export type PermissionDtoResourceEnumKey =
   (typeof permissionDtoResourceEnum)[keyof typeof permissionDtoResourceEnum];

export const permissionDtoActionEnum = {
   read: 'read',
   create: 'create',
   update: 'update',
   delete: 'delete',
   publish: 'publish',
} as const;

export type PermissionDtoActionEnumKey =
   (typeof permissionDtoActionEnum)[keyof typeof permissionDtoActionEnum];

export type PermissionDto = {
   resource: PermissionDtoResourceEnumKey;
   action: PermissionDtoActionEnumKey;
};
