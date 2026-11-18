import {
   Body,
   Controller,
   Delete,
   ForbiddenException,
   Get,
   HttpCode,
   HttpStatus,
   Param,
   Put,
   Query,
   UseGuards,
} from '@nestjs/common';
import {
   ApiBearerAuth,
   ApiNoContentResponse,
   ApiOkResponse,
   ApiOperation,
   ApiParam,
   ApiQuery,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { type AuthenticatedUser, AuthGuard, hasPermission } from '@/common/guards/auth.guard';
import { PermissionAction, type PermissionResource } from '@/generated/prisma/enums';

import { AcquireEditLockDto } from './dto/acquire-edit-lock.dto';
import { EditLockParamsDto } from './dto/edit-lock-params.dto';
import { ReleaseEditLockDto } from './dto/release-edit-lock.dto';
import { EditLockService, type EditLockState } from './edit-lock.service';
import { EditLockStateEntity } from './entity/edit-lock-state.entity';
import { EditLockEntity } from './enum/edit-lock-entity.enum';

const toEntity = ({ holder, mine }: EditLockState): EditLockStateEntity => ({
   heldBy: holder && { userId: holder.userId, name: holder.name, since: holder.since },
   mine,
});

const assertCanEdit = (user: AuthenticatedUser, entity: EditLockEntity) => {
   if (
      !hasPermission(user.role, {
         resource: entity as PermissionResource,
         action: PermissionAction.update,
      })
   ) {
      throw new ForbiddenException('Insufficient permissions');
   }
};

@ApiTags('Edit locks')
@Controller('edit-locks')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
@ApiParam({ name: 'entity', enum: EditLockEntity, enumName: 'EditLockEntity' })
@ApiResponse({
   status: 403,
   description: 'Missing the `update` permission of the entity',
   type: ErrorResponseDto,
})
@ApiResponse({
   status: 503,
   description: 'The lock store is down; the editor works without locks',
   type: ErrorResponseDto,
})
export class EditLockController {
   constructor(private readonly editLockService: EditLockService) {}

   @Put(':entity/:id')
   @ApiOperation({
      summary: 'Take or renew the edit lock of a record',
      description:
         'Another user holding the lock is not an error: the answer says who (`mine` false). ' +
         'With `takeOver` the lock moves to the caller.',
   })
   @ApiOkResponse({ type: EditLockStateEntity })
   async acquire(
      @CurrentUser() user: AuthenticatedUser,
      @Param() { entity, id }: EditLockParamsDto,
      @Body() dto: AcquireEditLockDto,
   ): Promise<EditLockStateEntity> {
      assertCanEdit(user, entity);
      return toEntity(
         await this.editLockService.acquire(
            entity,
            id,
            { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() },
            dto.sessionId,
            dto.takeOver ?? false,
         ),
      );
   }

   @Delete(':entity/:id')
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Release the edit lock of a record',
      description: 'Removes the lock only when the session holds it.',
   })
   @ApiNoContentResponse({ description: 'Released, or not held by the session' })
   async release(
      @CurrentUser() user: AuthenticatedUser,
      @Param() { entity, id }: EditLockParamsDto,
      @Body() dto: ReleaseEditLockDto,
   ): Promise<void> {
      assertCanEdit(user, entity);
      await this.editLockService.release(entity, id, user.id, dto.sessionId);
   }

   @Get(':entity/:id')
   @ApiOperation({ summary: 'Who holds the edit lock of a record' })
   @ApiQuery({ name: 'sessionId', required: false, description: 'Tab id, to fill `mine`' })
   @ApiOkResponse({ type: EditLockStateEntity })
   async find(
      @CurrentUser() user: AuthenticatedUser,
      @Param() { entity, id }: EditLockParamsDto,
      @Query('sessionId') sessionId?: string,
   ): Promise<EditLockStateEntity> {
      assertCanEdit(user, entity);
      return toEntity(
         await this.editLockService.find(
            entity,
            id,
            sessionId ? { userId: user.id, sessionId } : undefined,
         ),
      );
   }
}
