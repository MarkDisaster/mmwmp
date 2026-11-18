import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';

import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { CreateRoleTool } from './tools/create-role.tool';
import { DeleteRoleTool } from './tools/delete-role.tool';
import { FindRolesTool } from './tools/find-roles.tool';
import { GetRoleTool } from './tools/get-role.tool';
import { GrantRolePermissionTool } from './tools/grant-role-permission.tool';
import { ListRolesTool } from './tools/list-roles.tool';
import { RevokeRolePermissionTool } from './tools/revoke-role-permission.tool';
import { SetRolePermissionsTool } from './tools/set-role-permissions.tool';
import { UpdateRoleTool } from './tools/update-role.tool';

@Module({
   imports: [PrismaModule, AuthModule],
   controllers: [RoleController],
   providers: [
      ListRolesTool,
      FindRolesTool,
      GetRoleTool,
      CreateRoleTool,
      UpdateRoleTool,
      DeleteRoleTool,
      SetRolePermissionsTool,
      GrantRolePermissionTool,
      RevokeRolePermissionTool,
      RoleService,
   ],
   exports: [RoleService],
})
export class RoleModule {}
