import { Module } from '@nestjs/common';

import { AuthModule } from '@/auth/auth.module';
import { EmailModule } from '@/email/email.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';

import { DeactivateUserTool } from './tools/deactivate-user.tool';
import { DeleteUserTool } from './tools/delete-user.tool';
import { FindUsersTool } from './tools/find-users.tool';
import { GetMyProfileTool } from './tools/get-my-profile.tool';
import { InviteUserTool } from './tools/invite-user.tool';
import { ListUsersTool } from './tools/list-users.tool';
import { ReactivateUserTool } from './tools/reactivate-user.tool';
import { ResendUserInvitationTool } from './tools/resend-user-invitation.tool';
import { UpdateMyNameTool } from './tools/update-my-name.tool';
import { UpdateUserTool } from './tools/update-user.tool';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserInvitationService } from './user-invitation.service';

@Module({
   imports: [PrismaModule, AuthModule, EmailModule, StorageModule],
   controllers: [UserController],
   providers: [
      ListUsersTool,
      GetMyProfileTool,
      UpdateMyNameTool,
      FindUsersTool,
      InviteUserTool,
      ResendUserInvitationTool,
      UpdateUserTool,
      DeleteUserTool,
      DeactivateUserTool,
      ReactivateUserTool,
      UserService,
      UserInvitationService,
   ],
   exports: [UserService, UserInvitationService],
})
export class UserModule {}
