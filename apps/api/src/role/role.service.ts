import {
   BadRequestException,
   ConflictException,
   Injectable,
   NotFoundException,
} from '@nestjs/common';

import { AUTHOR_SELECT } from '@/common/author/author';
import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import type { Prisma } from '@/generated/prisma/client';
import { lockRole } from '@/prisma/aggregate-lock.helper';
import { buildOrderBy, buildPaginationArgs, buildSearchWhere } from '@/prisma/pagination.helper';
import { PrismaService } from '@/prisma/prisma.service';
import { type SaveErrorMessages, withSaveErrors } from '@/prisma/save-error.helper';
import { INTERACTIVE_TRANSACTION_OPTIONS } from '@/prisma/transaction.helper';

import type { CreateRoleDto } from './dto/create-role.dto';
import type { PermissionDto, SetPermissionsDto } from './dto/set-permissions.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { assertKnownPermissions } from './permission-catalog';
import {
   assertCanGrant,
   assertCanManageRole,
   findPrivilegeActor,
   type PrivilegeActor,
   type PrivilegeRole,
} from './role-privilege';

const ROLE_SAVE_ERRORS: SaveErrorMessages = {
   uniqueTaken: { field: 'name', message: 'Role with this name already exists' },
   referenceMissing: 'Role not found',
};

@Injectable()
export class RoleService {
   constructor(private prisma: PrismaService) {}

   async findAll(query: PaginationQueryDto) {
      const where = buildSearchWhere(query.search, ['name']);
      const [data, totalCount] = await this.prisma.$transaction([
         this.prisma.role.findMany({
            where,
            include: {
               permissions: true,
               createdBy: { select: AUTHOR_SELECT },
            },
            ...buildPaginationArgs(query),
            orderBy: buildOrderBy(query, { createdAt: 'createdAt', name: 'name' }, 'createdAt'),
         }),
         this.prisma.role.count({ where }),
      ]);
      return { data, totalCount };
   }

   async findOne(id: number) {
      const role = await this.prisma.role.findUnique({
         where: { id },
         include: {
            permissions: true,
            createdBy: { select: AUTHOR_SELECT },
         },
      });
      if (!role) throw new NotFoundException('Role not found');
      return role;
   }

   findLookupCandidates(take: number) {
      return this.prisma.role.findMany({
         select: { id: true, name: true, isSystem: true, isAdmin: true },
         orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
         take,
      });
   }

   async create(dto: CreateRoleDto, actorId: number) {
      const existing = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (existing) throw new ConflictException('Role with this name already exists');

      return withSaveErrors(
         () =>
            this.prisma.role.create({
               data: { name: dto.name, createdById: actorId },
               include: { permissions: true },
            }),
         ROLE_SAVE_ERRORS,
      );
   }

   async update(id: number, dto: UpdateRoleDto, actorId: number) {
      return this.writeRole(id, actorId, 'Cannot rename system roles', async (tx) => {
         const existing = await tx.role.findUnique({ where: { name: dto.name } });
         if (existing && existing.id !== id) {
            throw new ConflictException('Role name already taken');
         }
         return tx.role.update({
            where: { id },
            data: { name: dto.name },
            include: { permissions: true },
         });
      });
   }

   async remove(id: number, actorId: number) {
      await this.writeRole(id, actorId, 'Cannot delete system roles', async (tx) => {
         const usersCount = await tx.user.count({ where: { roleId: id } });
         if (usersCount > 0) {
            throw new BadRequestException('Cannot delete role that is assigned to users');
         }
         await tx.role.delete({ where: { id } });
      });
   }

   async setPermissions(id: number, dto: SetPermissionsDto, actorId: number) {
      assertKnownPermissions(dto.permissions);
      await this.writePermissions(
         id,
         actorId,
         (actor, role) => {
            assertCanManageRole(actor, role);
            assertCanGrant(actor, dto.permissions);
         },
         async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId: id } });
            await tx.rolePermission.createMany({
               data: dto.permissions.map((p) => ({
                  roleId: id,
                  resource: p.resource,
                  action: p.action,
               })),
               skipDuplicates: true,
            });
         },
      );

      return this.findOne(id);
   }

   async grantPermission(id: number, permission: PermissionDto, actorId: number) {
      assertKnownPermissions([permission]);
      const count = await this.writePermissions(
         id,
         actorId,
         (actor, role) => {
            assertCanManageRole(actor, role);
            assertCanGrant(actor, [permission]);
         },
         async (tx) => {
            const result = await tx.rolePermission.createMany({
               data: [{ roleId: id, resource: permission.resource, action: permission.action }],
               skipDuplicates: true,
            });
            return result.count;
         },
      );
      return { changed: count > 0, role: await this.findOne(id) };
   }

   async revokePermission(id: number, permission: PermissionDto, actorId: number) {
      const count = await this.writePermissions(
         id,
         actorId,
         (actor, role) => assertCanManageRole(actor, role),
         async (tx) => {
            const result = await tx.rolePermission.deleteMany({
               where: { roleId: id, resource: permission.resource, action: permission.action },
            });
            return result.count;
         },
      );
      return { changed: count > 0, role: await this.findOne(id) };
   }

   private writePermissions<T>(
      id: number,
      actorId: number,
      check: (actor: PrivilegeActor, role: PrivilegeRole) => void,
      write: (tx: Prisma.TransactionClient) => Promise<T>,
   ): Promise<T> {
      return withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               const { isAdmin } = await lockRole(tx, id);
               if (isAdmin) throw new BadRequestException('Cannot modify admin role permissions');
               const role = await tx.role.findUniqueOrThrow({
                  where: { id },
                  select: { id: true, isAdmin: true, permissions: true },
               });
               check(await findPrivilegeActor(tx, actorId), role);
               return write(tx);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         ROLE_SAVE_ERRORS,
      );
   }

   private writeRole<T>(
      id: number,
      actorId: number,
      systemMessage: string,
      write: (tx: Prisma.TransactionClient) => Promise<T>,
   ): Promise<T> {
      return withSaveErrors(
         () =>
            this.prisma.$transaction(async (tx) => {
               await lockRole(tx, id);
               const role = await tx.role.findUniqueOrThrow({
                  where: { id },
                  select: { id: true, isSystem: true, isAdmin: true, permissions: true },
               });
               if (role.isSystem) throw new BadRequestException(systemMessage);
               assertCanManageRole(await findPrivilegeActor(tx, actorId), role);
               return write(tx);
            }, INTERACTIVE_TRANSACTION_OPTIONS),
         ROLE_SAVE_ERRORS,
      );
   }
}
