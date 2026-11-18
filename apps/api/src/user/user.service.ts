import {
   BadRequestException,
   ConflictException,
   ForbiddenException,
   Injectable,
   NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';

import { hashPassword, verifyPassword } from '@/auth/password';
import { revokeAllSessions } from '@/auth/session-revocation';
import { normalizeEmail } from '@/common/decorators/normalize-email.decorator';
import { Prisma } from '@/generated/prisma/client';
import { buildOrderBy, buildPaginationArgs, buildSearchWhere } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { withSaveErrors } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS, setLockTimeout } from '@/prisma/transaction.helper';
import {
   assertCanManageUser,
   findAssignableRole,
   findPrivilegeActor,
   PRIVILEGE_MESSAGES,
   type PrivilegeActor,
   USER_SAVE_ERRORS,
} from '@/role/role-privilege';
import { SHARP_INPUT, StorageService } from '@/storage/storage.service';

import type { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateNameDto } from './dto/update-name.dto';
import type { UpdateUserRoleDto } from './dto/update-user-role.dto';
import type { UserListQueryDto } from './dto/user-list-query.dto';

const AVATAR_SIZE = 256;
const AVATAR_QUALITY = 85;

const USER_SELECT = {
   id: true,
   email: true,
   firstName: true,
   lastName: true,
   avatarPath: true,
   role: { include: { permissions: true } },
   deactivatedAt: true,
   deactivatedById: true,
   invitedAt: true,
   acceptedInvitationAt: true,
   createdAt: true,
   updatedAt: true,
} as const;

@Injectable()
export class UserService {
   constructor(
      private prisma: PrismaService,
      private storage: StorageService,
   ) {}

   async findAll(query: UserListQueryDto) {
      const where = {
         deletedAt: null,
         ...(query.status === 'active' && { deactivatedAt: null }),
         ...(query.status === 'deactivated' && { deactivatedAt: { not: null } }),
         ...buildSearchWhere(query.search, ['email', 'firstName', 'lastName']),
      };
      const [users, totalCount] = await this.prisma.$transaction([
         this.prisma.user.findMany({
            where,
            select: USER_SELECT,
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(
               query,
               { createdAt: 'createdAt', email: 'email', firstName: 'firstName' },
               'createdAt',
               'desc',
            ),
         }),
         this.prisma.user.count({ where }),
      ]);
      return { data: users.map((u) => this.mapWithAvatarUrl(u)), totalCount };
   }

   async findOne(id: number) {
      const user = await this.prisma.user.findFirst({
         where: { id, deletedAt: null },
         select: USER_SELECT,
      });

      if (!user) throw new NotFoundException('User not found');
      return this.mapWithAvatarUrl(user);
   }

   findLookupCandidates(take: number) {
      return this.prisma.user.findMany({
         where: { deletedAt: null },
         select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            deactivatedAt: true,
            role: { select: { id: true, name: true } },
         },
         orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
         take,
      });
   }

   private mapWithAvatarUrl<T extends { avatarPath: string | null }>(
      user: T,
   ): Omit<T, 'avatarPath'> & { avatarUrl: string | null } {
      const { avatarPath, ...rest } = user;
      return { ...rest, avatarUrl: avatarPath ? this.storage.getPublicUrl(avatarPath) : null };
   }

   private async findManageableUser(
      tx: Prisma.TransactionClient,
      actor: PrivilegeActor,
      userId: number,
      adminMessage: string,
   ) {
      const user = await tx.user.findFirst({
         where: { id: userId, deletedAt: null },
         include: { role: { include: { permissions: true } } },
      });
      if (!user) throw new NotFoundException('User not found');
      if (user.role.isAdmin) throw new BadRequestException(adminMessage);
      assertCanManageUser(actor, user);
      return user;
   }

   async createUser(dto: CreateUserDto, actorId: number) {
      const email = normalizeEmail(dto.email);
      const hashedPassword = await hashPassword(dto.password);

      const userId = await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const existing = await tx.user.findUnique({ where: { email } });
               if (existing && !existing.deletedAt) {
                  throw new ConflictException('User with this email already exists');
               }

               const actor = await findPrivilegeActor(tx, actorId);
               await findAssignableRole(tx, actor, dto.roleId, 'Cannot assign admin role');

               if (existing) {
                  await tx.auth.upsert({
                     where: { userId: existing.id },
                     update: { password: hashedPassword },
                     create: { userId: existing.id, password: hashedPassword },
                  });
                  await tx.user.update({
                     where: { id: existing.id },
                     data: {
                        firstName: dto.firstName,
                        lastName: dto.lastName,
                        roleId: dto.roleId,
                        acceptedInvitationAt: new Date(),
                        deletedAt: null,
                        deactivatedAt: null,
                        deactivatedById: null,
                     },
                  });
                  await revokeAllSessions(tx, existing.id);
                  return existing.id;
               }

               const created = await tx.user.create({
                  data: {
                     email,
                     firstName: dto.firstName,
                     lastName: dto.lastName,
                     roleId: dto.roleId,
                     acceptedInvitationAt: new Date(),
                     auth: { create: { password: hashedPassword } },
                  },
               });
               return created.id;
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );

      return this.findOne(userId);
   }

   async adminUpdateUser(userId: number, dto: AdminUpdateUserDto, actorId: number) {
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const actor = await findPrivilegeActor(tx, actorId);
               const user = await this.findManageableUser(
                  tx,
                  actor,
                  userId,
                  'Cannot edit admin user',
               );

               const email = dto.email === undefined ? undefined : normalizeEmail(dto.email);
               const emailChanges = email !== undefined && email !== user.email;
               if (emailChanges) {
                  if (!actor.role.isAdmin) {
                     throw new ForbiddenException(PRIVILEGE_MESSAGES.otherEmail);
                  }
                  const existing = await tx.user.findUnique({ where: { email } });
                  if (existing) throw new ConflictException('User with this email already exists');
               }

               if (dto.roleId !== undefined) {
                  await findAssignableRole(tx, actor, dto.roleId, 'Cannot assign admin role');
               }

               await tx.user.update({
                  where: { id: userId },
                  data: {
                     ...(dto.firstName !== undefined && { firstName: dto.firstName }),
                     ...(dto.lastName !== undefined && { lastName: dto.lastName }),
                     ...(emailChanges && { email }),
                     ...(dto.roleId !== undefined && { roleId: dto.roleId }),
                  },
               });
               if (emailChanges) await revokeAllSessions(tx, userId);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );

      return this.findOne(userId);
   }

   async updateName(userId: number, dto: UpdateNameDto) {
      const { count } = await this.prisma.user.updateMany({
         where: { id: userId, deletedAt: null },
         data: { firstName: dto.firstName, lastName: dto.lastName },
      });

      if (count === 0) throw new NotFoundException('User not found');
      return this.findOne(userId);
   }

   async updateRole(userId: number, dto: UpdateUserRoleDto, actorId: number) {
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const actor = await findPrivilegeActor(tx, actorId);
               await this.findManageableUser(tx, actor, userId, 'Cannot change admin user role');
               await findAssignableRole(
                  tx,
                  actor,
                  dto.roleId,
                  'Cannot assign admin role to user',
                  () => new NotFoundException('Role not found'),
               );
               await tx.user.update({ where: { id: userId }, data: { roleId: dto.roleId } });
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );
      return this.findOne(userId);
   }

   async deactivate(userId: number, actorId: number) {
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const actor = await findPrivilegeActor(tx, actorId);
               await this.findManageableUser(tx, actor, userId, 'Cannot deactivate admin user');
               const { count } = await tx.user.updateMany({
                  where: { id: userId, deletedAt: null, deactivatedAt: null },
                  data: { deactivatedAt: new Date(), deactivatedById: actorId },
               });
               if (count === 0) throw new ConflictException('User is already deactivated');
               await revokeAllSessions(tx, userId);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );
      return this.findOne(userId);
   }

   async reactivate(userId: number, actorId: number) {
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const actor = await findPrivilegeActor(tx, actorId);
               await this.findManageableUser(tx, actor, userId, 'Cannot reactivate admin user');
               const { count } = await tx.user.updateMany({
                  where: { id: userId, deletedAt: null, deactivatedAt: { not: null } },
                  data: {
                     deactivatedAt: null,
                     deactivatedById: null,
                     sessionsValidAfter: new Date(),
                  },
               });
               if (count === 0) throw new ConflictException('User is not deactivated');
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );
      return this.findOne(userId);
   }

   async softDelete(userId: number, actorId: number) {
      await withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const actor = await findPrivilegeActor(tx, actorId);
               await this.findManageableUser(tx, actor, userId, 'Cannot delete admin user');
               await setLockTimeout(tx);
               await tx.$queryRaw(Prisma.sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
               const { _count } = await tx.user.findUniqueOrThrow({
                  where: { id: userId },
                  select: {
                     _count: {
                        select: {
                           projects: true,
                           files: true,
                           tags: true,
                           services: true,
                           roles: true,
                           auditLogs: true,
                        },
                     },
                  },
               });
               if (Object.values(_count).some((count) => count > 0)) {
                  throw new ConflictException(
                     'User has authored content or an audit trail and cannot be deleted, deactivate the user instead',
                  );
               }
               await tx.user.update({
                  where: { id: userId },
                  data: { deletedAt: new Date() },
               });
               await revokeAllSessions(tx, userId);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         USER_SAVE_ERRORS,
      );
   }

   async changePassword(userId: number, dto: ChangePasswordDto) {
      const user = await this.prisma.user.findFirst({
         where: { id: userId, deletedAt: null },
         include: { auth: true },
      });
      if (!user?.auth) throw new NotFoundException('User not found');

      const isValid = await verifyPassword(dto.currentPassword, user.auth.password);
      if (!isValid) throw new BadRequestException('Current password is incorrect');

      const hashed = await hashPassword(dto.newPassword);
      await this.prisma.$transaction(async (tx) => {
         await tx.auth.update({ where: { userId }, data: { password: hashed } });
         await revokeAllSessions(tx, userId);
      });
   }

   async deleteAvatar(userId: number) {
      const existing = await this.prisma.user.findFirst({
         where: { id: userId, deletedAt: null },
         select: { avatarPath: true },
      });
      if (!existing) throw new NotFoundException('User not found');

      await this.prisma.user.update({
         where: { id: userId },
         data: { avatarPath: null },
      });

      if (existing.avatarPath) {
         await this.storage.delete(existing.avatarPath).catch(() => null);
      }

      return this.findOne(userId);
   }

   async updateAvatar(userId: number, file: Express.Multer.File) {
      const existing = await this.prisma.user.findFirst({
         where: { id: userId, deletedAt: null },
         select: { avatarPath: true },
      });
      if (!existing) throw new NotFoundException('User not found');

      const processed = await sharp(file.buffer, SHARP_INPUT)
         .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
         .webp({ quality: AVATAR_QUALITY })
         .toBuffer()
         .catch(() => {
            throw new BadRequestException('The avatar image cannot be read');
         });

      const key = `avatars/${userId}/avatar-${Date.now()}.webp`;
      await this.storage.uploadBuffer(processed, key, 'image/webp');

      try {
         await this.prisma.user.update({
            where: { id: userId },
            data: { avatarPath: key },
         });
      } catch (error) {
         await this.storage.delete(key).catch(() => null);
         throw error;
      }

      if (existing.avatarPath) {
         await this.storage.delete(existing.avatarPath).catch(() => null);
      }

      return this.findOne(userId);
   }
}
