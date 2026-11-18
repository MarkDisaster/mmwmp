/* eslint-disable */

import type { RoleEntity } from './RoleEntity';

export type UserEntity = {
   id: number;
   email: string;
   firstName: string;
   lastName: string;
   avatarUrl?: string | null;
   role: RoleEntity;
   deletedAt?: string | null;
   deactivatedAt?: string | null;
   deactivatedById?: number | null;
   invitedAt?: string | null;
   acceptedInvitationAt?: string | null;
   createdAt: string;
   updatedAt: string;
};
