import type { RoleEntity, UserEntity } from '@/api/generated';

const TIMESTAMP = '2026-01-01T00:00:00.000Z';

export const createRole = (
   grants: string[],
   overrides: Partial<Omit<RoleEntity, 'permissions'>> = {},
): RoleEntity => ({
   id: 2,
   name: 'editor',
   isSystem: false,
   isAdmin: false,
   permissions: grants.map((grant, index) => {
      const [resource = '', action = ''] = grant.split('.');
      return { id: index + 1, resource, action };
   }),
   createdAt: TIMESTAMP,
   updatedAt: TIMESTAMP,
   ...overrides,
});

export const ADMIN_ROLE = createRole([], { id: 1, name: 'admin', isSystem: true, isAdmin: true });

export const createUser = (role: RoleEntity, overrides: Partial<UserEntity> = {}): UserEntity => ({
   id: 10,
   email: 'jana@example.com',
   firstName: 'Jana',
   lastName: 'Nováková',
   avatarUrl: null,
   role,
   deletedAt: null,
   deactivatedAt: null,
   invitedAt: null,
   acceptedInvitationAt: TIMESTAMP,
   createdAt: TIMESTAMP,
   updatedAt: TIMESTAMP,
   ...overrides,
});
