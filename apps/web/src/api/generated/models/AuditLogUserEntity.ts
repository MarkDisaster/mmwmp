/* eslint-disable */

import type { AuditLogUserRoleEntity } from './AuditLogUserRoleEntity';

export type AuditLogUserEntity = {
   id: number;
   email?: string;
   firstName: string;
   lastName: string;
   role: AuditLogUserRoleEntity;
};
