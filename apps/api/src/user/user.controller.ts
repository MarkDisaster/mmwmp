import {
   Body,
   Controller,
   Delete,
   FileTypeValidator,
   Get,
   Head,
   HttpCode,
   HttpStatus,
   Param,
   ParseFilePipe,
   ParseIntPipe,
   Patch,
   Post,
   Query,
   UploadedFile,
   UseGuards,
   UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { AuthResponseEntity } from '@/auth/entity/auth-response.entity';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { AVATAR_UPLOAD_MAX_BYTES, singleFileUpload } from '@/config/upload-limits';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateNameDto } from './dto/update-name.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserInvitationDto } from './dto/user-invitation.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { UserEntity } from './entity/user.entity';
import { UserService } from './user.service';
import { UserInvitationService } from './user-invitation.service';

const AVATAR_IMAGE_TYPE = /^image\/(jpeg|png|apng|webp|gif)$/;

@ApiTags('Users')
@Controller('users')
export class UserController {
   constructor(
      private userService: UserService,
      private userInvitationService: UserInvitationService,
   ) {}

   @Post()
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.create', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.create)
   @ApiOperation({ summary: 'Create new user directly (admin only)' })
   @ApiResponse({ status: 201, description: 'User created', type: UserEntity })
   @ApiResponse({ status: 409, description: 'User with this email already exists' })
   create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: number) {
      return this.userService.createUser(dto, actorId);
   }

   @Get()
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @RequirePermission(PermissionResource.users, PermissionAction.read)
   @ApiOperation({ summary: 'Get all users' })
   @ApiPaginatedResponse(UserEntity)
   findAll(@Query() query: UserListQueryDto) {
      return this.userService.findAll(query);
   }

   @Get('me')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @ApiOperation({ summary: 'Get current user profile' })
   @ApiResponse({ status: 200, description: 'Current user details', type: UserEntity })
   getMe(@CurrentUser('id') userId: number) {
      return this.userService.findOne(userId);
   }

   @Get(':id')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @RequirePermission(PermissionResource.users, PermissionAction.read)
   @ApiOperation({ summary: 'Get user by ID' })
   @ApiResponse({ status: 200, description: 'User details', type: UserEntity })
   @ApiResponse({ status: 404, description: 'User not found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
      return this.userService.findOne(id);
   }

   @Patch(':id')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.update', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.update)
   @ApiOperation({ summary: 'Update user (admin only)' })
   @ApiResponse({ status: 200, description: 'User updated', type: UserEntity })
   @ApiResponse({ status: 400, description: 'Cannot edit admin user' })
   @ApiResponse({
      status: 403,
      description:
         'Own account, a user or role above the caller, or the email of another user by a non-admin',
   })
   @ApiResponse({ status: 409, description: 'Email already in use' })
   adminUpdate(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: AdminUpdateUserDto,
      @CurrentUser('id') actorId: number,
   ) {
      return this.userService.adminUpdateUser(id, dto, actorId);
   }

   @Patch('me/name')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.updateName', 'user')
   @ApiOperation({ summary: 'Update current user name' })
   @ApiResponse({ status: 200, description: 'Name updated', type: UserEntity })
   updateName(@CurrentUser('id') userId: number, @Body() dto: UpdateNameDto) {
      return this.userService.updateName(userId, dto);
   }

   @Patch('me/avatar')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.updateAvatar', 'user')
   @ApiOperation({ summary: 'Upload profile avatar' })
   @ApiResponse({ status: 200, description: 'Avatar updated', type: UserEntity })
   @ApiConsumes('multipart/form-data')
   @ApiResponse({ status: 413, description: 'Image larger than 5 MB' })
   @UseInterceptors(FileInterceptor('file', singleFileUpload(AVATAR_UPLOAD_MAX_BYTES)))
   updateAvatar(
      @CurrentUser('id') userId: number,
      @UploadedFile(
         new ParseFilePipe({
            validators: [
               new FileTypeValidator({
                  fileType: AVATAR_IMAGE_TYPE,
                  errorMessage: 'The avatar must be a JPEG, PNG, WebP or GIF image',
               }),
            ],
         }),
      )
      file: Express.Multer.File,
   ) {
      return this.userService.updateAvatar(userId, file);
   }

   @Delete('me/avatar')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.deleteAvatar', 'user')
   @ApiOperation({ summary: 'Delete profile avatar' })
   @ApiResponse({ status: 200, description: 'Avatar deleted', type: UserEntity })
   deleteAvatar(@CurrentUser('id') userId: number) {
      return this.userService.deleteAvatar(userId);
   }

   @Patch('me/password')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.changePassword', 'user')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Change current user password',
      description: 'Ends every session of the user, the current one too: sign in again.',
   })
   @ApiResponse({ status: 204, description: 'Password changed, all sessions ended' })
   @ApiResponse({ status: 400, description: 'Current password incorrect' })
   changePassword(@CurrentUser('id') userId: number, @Body() dto: ChangePasswordDto) {
      return this.userService.changePassword(userId, dto);
   }

   @Patch(':id/role')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.updateRole', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.update)
   @ApiOperation({ summary: 'Update user role (admin only)' })
   @ApiResponse({ status: 200, type: UserEntity })
   @ApiResponse({ status: 400, description: 'Cannot change admin user role' })
   @ApiResponse({ status: 404, description: 'User or role not found' })
   updateRole(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateUserRoleDto,
      @CurrentUser('id') actorId: number,
   ) {
      return this.userService.updateRole(id, dto, actorId);
   }

   @Patch(':id/deactivate')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.deactivate', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.update)
   @ApiOperation({
      summary: 'Deactivate user',
      description:
         'The account stays (audit log, authorship) but cannot sign in or refresh a token; every ' +
         'session ends at once. Reversible with `PATCH /users/:id/reactivate`.',
   })
   @ApiResponse({ status: 200, description: 'User deactivated', type: UserEntity })
   @ApiResponse({ status: 400, description: 'Cannot deactivate admin user' })
   @ApiResponse({
      status: 403,
      description: 'Own account or a user with permissions the caller does not have',
   })
   @ApiResponse({ status: 404, description: 'User not found' })
   @ApiResponse({ status: 409, description: 'User is already deactivated' })
   deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
      return this.userService.deactivate(id, actorId);
   }

   @Patch(':id/reactivate')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.reactivate', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.update)
   @ApiOperation({
      summary: 'Reactivate user',
      description:
         'The user signs in again with the credentials they had. Every token issued before ' +
         'the reactivation stays void: the refresh tokens are revoked and an access token with ' +
         'an older `iat` is refused (`sessionsValidAfter`), so the user signs in again.',
   })
   @ApiResponse({ status: 200, description: 'User reactivated', type: UserEntity })
   @ApiResponse({ status: 403, description: 'A user with permissions the caller does not have' })
   @ApiResponse({ status: 404, description: 'User not found' })
   @ApiResponse({ status: 409, description: 'User is not deactivated' })
   reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
      return this.userService.reactivate(id, actorId);
   }

   @Delete(':id')
   @HttpCode(204)
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.delete', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.delete)
   @ApiOperation({ summary: 'Soft delete user (admin only)' })
   @ApiResponse({ status: 204, description: 'User soft deleted' })
   @ApiResponse({ status: 403, description: 'Insufficient permissions' })
   @ApiResponse({ status: 404, description: 'User not found' })
   @ApiResponse({
      status: 409,
      description: 'User has authored content or an audit trail: deactivate the user instead',
   })
   remove(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
      return this.userService.softDelete(id, actorId);
   }

   @Post('invitations')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.invite', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.create)
   @ApiOperation({ summary: 'Invite new user by email (admin only)' })
   @ApiResponse({ status: 201, description: 'Invitation sent' })
   @ApiResponse({ status: 409, description: 'User with this email already exists' })
   invite(@Body() dto: UserInvitationDto, @CurrentUser('id') actorId: number) {
      return this.userInvitationService.invite(dto.email, dto.roleId, actorId);
   }

   @Post(':id/resend-invitation')
   @UseGuards(AuthGuard)
   @ApiBearerAuth('JWT-auth')
   @AuditAction('user.resendInvitation', 'user')
   @RequirePermission(PermissionResource.users, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ summary: 'Resend invitation email to pending user (admin only)' })
   @ApiResponse({ status: 204, description: 'Invitation resent' })
   @ApiResponse({ status: 404, description: 'Pending user not found' })
   resendInvitation(@Param('id', ParseIntPipe) id: number, @CurrentUser('id') actorId: number) {
      return this.userInvitationService.resend(id, actorId);
   }

   @Head('invitations/:token')
   @ApiOperation({ summary: 'Verify invitation token validity' })
   @ApiResponse({ status: 200, description: 'Token is valid' })
   @ApiResponse({ status: 400, description: 'Token is invalid or expired' })
   verifyInvitation(@Param('token') token: string) {
      return this.userInvitationService.verify(token);
   }

   @Post('invitations/:token/accept')
   @ApiOperation({ summary: 'Accept invitation and create account' })
   @ApiResponse({
      status: 201,
      description: 'Account created, returns tokens',
      type: AuthResponseEntity,
   })
   @ApiResponse({ status: 400, description: 'Invalid or expired token' })
   acceptInvitation(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
      return this.userInvitationService.accept(token, dto);
   }
}
