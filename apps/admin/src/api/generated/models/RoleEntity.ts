/* eslint-disable */

import type { AuthorEntity } from './AuthorEntity';
import type { RolePermissionEntity } from './RolePermissionEntity';

export type RoleEntity = {
   id: number;
   name: string;
   isSystem: boolean;
   isAdmin: boolean;
   permissions: RolePermissionEntity[];
   createdAt: string;
   updatedAt: string;
   createdBy?: AuthorEntity | null;
};
