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
   Query,
   UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { ApiMoveEndpoint } from '@/common/decorators/api-move-endpoint.decorator';
import { ApiVersionConflictResponse } from '@/common/decorators/api-save-error-responses.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { MoveItemDto } from '@/common/dto/move-item.dto';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { type AuthenticatedUser, AuthGuard } from '@/common/guards/auth.guard';
import { TrashedItemEntity } from '@/common/trash/trashed-item.entity';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagEntity } from './entity/tag.entity';
import { TagService } from './tag.service';

@ApiTags('Tags')
@Controller('tags')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class TagController {
   constructor(private tagService: TagService) {}

   @Post()
   @AuditAction('tag.create', 'tag')
   @RequirePermission(PermissionResource.tags, PermissionAction.create)
   @ApiOperation({ summary: 'Create a new tag' })
   @ApiResponse({ status: 201, description: 'Tag created', type: TagEntity })
   @ApiResponse({ status: 409, description: 'Tag with this slug already exists' })
   create(@Body() dto: CreateTagDto) {
      return this.tagService.create(dto);
   }

   @Get()
   @RequirePermission(PermissionResource.tags, PermissionAction.read)
   @ApiOperation({ summary: 'Get all tags' })
   @ApiPaginatedResponse(TagEntity)
   findAll(@Query() query: PaginationQueryDto) {
      return this.tagService.findAll(query);
   }

   @Get('trash')
   @RequirePermission(PermissionResource.tags, PermissionAction.delete)
   @ApiOperation({
      summary: 'List the tags in the trash',
      description:
         'Most recently deleted first. Purged automatically after the retention (30 days).',
   })
   @ApiPaginatedResponse(TrashedItemEntity)
   findTrashed(@Query() query: PaginationQueryDto) {
      return this.tagService.findTrashed(query);
   }

   @Get(':id')
   @RequirePermission(PermissionResource.tags, PermissionAction.read)
   @ApiOperation({ summary: 'Get tag by ID' })
   @ApiResponse({ status: 200, description: 'Tag details', type: TagEntity })
   @ApiResponse({ status: 404, description: 'Tag not found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
      return this.tagService.findOne(id);
   }

   @Patch(':id')
   @AuditAction('tag.update', 'tag')
   @RequirePermission(PermissionResource.tags, PermissionAction.update)
   @ApiOperation({ summary: 'Update tag' })
   @ApiResponse({ status: 200, description: 'Tag updated', type: TagEntity })
   @ApiResponse({ status: 404, description: 'Tag not found' })
   @ApiVersionConflictResponse('Tag with this slug already exists')
   update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTagDto) {
      return this.tagService.update(id, dto);
   }

   @Post(':id/move')
   @AuditAction('tag.move', 'tag')
   @RequirePermission(PermissionResource.tags, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiMoveEndpoint('tag')
   move(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveItemDto) {
      return this.tagService.move(id, dto);
   }

   @Delete(':id')
   @AuditAction('tag.trash', 'tag')
   @RequirePermission(PermissionResource.tags, PermissionAction.delete)
   @HttpCode(204)
   @ApiOperation({
      summary: 'Move a tag to the trash',
      description:
         'The tag disappears from the lists, the pickers, the projects and the web, but stays ' +
         'attached to its projects: a restore (`POST :id/restore`) puts it back on them. Purged ' +
         'after 30 days.',
   })
   @ApiResponse({ status: 204, description: 'Tag moved to the trash' })
   @ApiResponse({ status: 404, description: 'Tag not found' })
   remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
      return this.tagService.trash(id, user.id);
   }

   @Post(':id/restore')
   @AuditAction('tag.restore', 'tag')
   @HttpCode(HttpStatus.OK)
   @RequirePermission(PermissionResource.tags, PermissionAction.delete)
   @ApiOperation({
      summary: 'Restore a tag from the trash',
      description: 'Returns it at the end of the order.',
   })
   @ApiResponse({ status: 200, description: 'Restored', type: TagEntity })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   @ApiResponse({ status: 409, description: 'The original slug or name is taken now' })
   restore(@Param('id', ParseIntPipe) id: number) {
      return this.tagService.restore(id);
   }

   @Delete(':id/permanent')
   @AuditAction('tag.deletePermanently', 'tag')
   @RequirePermission(PermissionResource.tags, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Delete a tag in the trash for good',
      description: 'Only for a tag that is in the trash. Irreversible.',
   })
   @ApiResponse({ status: 204, description: 'Deleted for good' })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   async removePermanently(@Param('id', ParseIntPipe) id: number) {
      await this.tagService.removePermanently(id);
   }
}
