import {
   Body,
   Controller,
   Delete,
   Get,
   HttpCode,
   HttpStatus,
   Param,
   ParseIntPipe,
   Patch,
   Post,
   Put,
   Query,
   UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleEntity } from './entity/role.entity';
import { RoleService } from './role.service';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class RoleController {
   constructor(private roleService: RoleService) {}

   @Get()
   @RequirePermission(PermissionResource.roles, PermissionAction.read)
   @ApiOperation({ summary: 'List all roles with permissions' })
   @ApiPaginatedResponse(RoleEntity)
   findAll(@Query() query: PaginationQueryDto) {
      return this.roleService.findAll(query);
   }

   @Get(':id')
   @RequirePermission(PermissionResource.roles, PermissionAction.read)
   @ApiOperation({ summary: 'Get role by ID' })
   @ApiResponse({ status: 200, type: RoleEntity })
   findOne(@Param('id', ParseIntPipe) id: number) {
      return this.roleService.findOne(id);
   }

   @Post()
   @AuditAction('role.create', 'role')
   @RequirePermission(PermissionResource.roles, PermissionAction.create)
   @ApiOperation({ summary: 'Create a new role' })
   @ApiResponse({ status: 201, type: RoleEntity })
   create(@Body() dto: CreateRoleDto, @CurrentUser('id') actorId: number) {
      return this.roleService.create(dto, actorId);
   }

   @Patch(':id')
   @AuditAction('role.update', 'role')
   @RequirePermission(PermissionResource.roles, PermissionAction.update)
   @ApiOperation({ summary: 'Rename a role (non-system only)' })
   @ApiResponse({ status: 200, type: RoleEntity })
   update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateRoleDto,
      @CurrentUser('id') actorId: number,
   ) {
      return this.roleService.update(id, dto, actorId);
   }

   @Delete(':id')
   @AuditAction('role.delete', 'role')
   @RequirePermission(PermissionResource.roles, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ summary: 'Delete a role (non-system only)' })
   @ApiResponse({ status: 204 })
   remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
      return this.roleService.remove(id, actorId);
   }

   @Put(':id/permissions')
   @AuditAction('role.setPermissions', 'role')
   @RequirePermission(PermissionResource.roles, PermissionAction.update)
   @ApiOperation({ summary: 'Replace all permissions for a role' })
   @ApiResponse({ status: 200, type: RoleEntity })
   @ApiResponse({
      status: 400,
      description: 'The admin role, or a resource and action pair that is not a permission',
   })
   @ApiResponse({
      status: 403,
      description: 'Own role, a role above the caller or a permission the caller does not hold',
   })
   setPermissions(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: SetPermissionsDto,
      @CurrentUser('id') actorId: number,
   ) {
      return this.roleService.setPermissions(id, dto, actorId);
   }
}
