import {
   Body,
   Controller,
   Delete,
   Get,
   HttpCode,
   HttpStatus,
   MaxFileSizeValidator,
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
import {
   ApiBearerAuth,
   ApiBody,
   ApiConsumes,
   ApiOperation,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import {
   ApiVersionConflictResponse,
   BUSY_CONFLICT,
} from '@/common/decorators/api-save-error-responses.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ErrorResponseDto } from '@/common/dto/error-response.dto';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { type AuthenticatedUser, AuthGuard } from '@/common/guards/auth.guard';
import { toSaveActor } from '@/common/save/save-actor';
import { TrashedItemEntity } from '@/common/trash/trashed-item.entity';
import { FILE_UPLOAD_MAX_BYTES, singleFileUpload } from '@/config/upload-limits';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { FileQueryDto } from './dto/file-query.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { UploadFileBodyDto, UploadFileDto } from './dto/upload-file.dto';
import { FileEntity } from './entity/file.entity';
import { FileService } from './file.service';
import { type DetectedFile, DetectedFileTypePipe } from './pipes/detected-file-type.pipe';

@ApiTags('Files')
@Controller('files')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class FileController {
   constructor(private fileService: FileService) {}

   @Post()
   @AuditAction('file.upload', 'file')
   @RequirePermission(PermissionResource.files, PermissionAction.create)
   @ApiOperation({ summary: 'Upload a file' })
   @ApiResponse({ status: 201, description: 'File uploaded', type: FileEntity })
   @ApiConsumes('multipart/form-data')
   @ApiBody({ type: UploadFileBodyDto })
   @ApiResponse({
      status: 400,
      description: 'No file, a file of a type that is not allowed, or an invalid form field',
      type: ErrorResponseDto,
   })
   @ApiResponse({ status: 413, description: 'File larger than 10 MB' })
   @UseInterceptors(FileInterceptor('file', singleFileUpload(FILE_UPLOAD_MAX_BYTES)))
   upload(
      @UploadedFile(
         new ParseFilePipe({
            validators: [new MaxFileSizeValidator({ maxSize: FILE_UPLOAD_MAX_BYTES })],
         }),
         new DetectedFileTypePipe(),
      )
      file: DetectedFile,
      @CurrentUser('id') userId: number,
      @Body() dto: UploadFileDto,
   ) {
      return this.fileService.upload(file, userId, dto.displayName, dto.language);
   }

   @Get()
   @RequirePermission(PermissionResource.files, PermissionAction.read)
   @ApiOperation({
      summary: 'Get all files',
      description:
         'Paginated when `limit` is sent, otherwise every matching file. `mimeTypePrefix` narrows ' +
         'the list to one type or family of types (e.g. `image/`).',
   })
   @ApiPaginatedResponse(FileEntity)
   @ApiResponse({ status: 400, description: 'Invalid query, e.g. a malformed `mimeTypePrefix`' })
   findAll(@Query() query: FileQueryDto) {
      return this.fileService.findAll(query);
   }

   @Get('trash')
   @RequirePermission(PermissionResource.files, PermissionAction.delete)
   @ApiOperation({
      summary: 'List the files in the trash',
      description:
         'Most recently deleted first. Purged automatically after the retention (30 days).',
   })
   @ApiPaginatedResponse(TrashedItemEntity)
   findTrashed(@Query() query: PaginationQueryDto) {
      return this.fileService.findTrashed(query);
   }

   @Get(':id')
   @RequirePermission(PermissionResource.files, PermissionAction.read)
   @ApiOperation({ summary: 'Get file by ID' })
   @ApiResponse({ status: 200, description: 'File details', type: FileEntity })
   findOne(@Param('id', ParseIntPipe) id: number) {
      return this.fileService.findOne(id);
   }

   @Patch(':id')
   @AuditAction('file.update', 'file')
   @RequirePermission(PermissionResource.files, PermissionAction.update)
   @ApiOperation({ summary: 'Update file metadata' })
   @ApiResponse({ status: 200, type: FileEntity })
   @ApiResponse({
      status: 403,
      description: 'The file is used by a published project and the caller lacks `publish`',
      type: ErrorResponseDto,
   })
   @ApiResponse({ status: 404, description: 'File not found', type: ErrorResponseDto })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateFileDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.fileService.update(
         id,
         { displayName: dto.displayName, language: dto.language, altText: dto.altText },
         toSaveActor(user, PermissionResource.projects).canPublish,
         dto.version,
      );
   }

   @Delete(':id')
   @AuditAction('file.trash', 'file')
   @RequirePermission(PermissionResource.files, PermissionAction.delete)
   @HttpCode(204)
   @ApiOperation({
      summary: 'Move a file to the trash',
      description:
         'The file leaves the library and the web, the storage objects stay until it is deleted for ' +
         'good (`DELETE :id/permanent`, or the purge after 30 days). A project that uses it keeps ' +
         'the reference. Like an edit of the file it needs `publish` when a published project shows it.',
   })
   @ApiResponse({ status: 204, description: 'File moved to the trash' })
   @ApiResponse({ status: 404, description: 'File not found' })
   @ApiResponse({
      status: 403,
      description: 'The file is used by a published project and the caller lacks `publish`',
      type: ErrorResponseDto,
   })
   remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
      return this.fileService.trash(
         id,
         user.id,
         toSaveActor(user, PermissionResource.projects).canPublish,
      );
   }

   @Post(':id/restore')
   @AuditAction('file.restore', 'file')
   @HttpCode(HttpStatus.OK)
   @RequirePermission(PermissionResource.files, PermissionAction.delete)
   @ApiOperation({
      summary: 'Restore a file from the trash',
      description:
         'Projects that use it show it again, so it needs `publish` when a published project does.',
   })
   @ApiResponse({ status: 200, description: 'Restored', type: FileEntity })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   @ApiResponse({
      status: 403,
      description: 'A published project shows the file and the caller lacks `publish`',
      type: ErrorResponseDto,
   })
   @ApiResponse({
      status: 409,
      description: 'Another change of the same data is in progress (lock timeout), try again',
   })
   restore(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
      return this.fileService.restore(
         id,
         toSaveActor(user, PermissionResource.projects).canPublish,
      );
   }

   @Delete(':id/permanent')
   @AuditAction('file.deletePermanently', 'file')
   @RequirePermission(PermissionResource.files, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Delete a file in the trash for good',
      description: 'Only for a file that is in the trash. Irreversible.',
   })
   @ApiResponse({ status: 204, description: 'Deleted for good' })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   @ApiResponse({
      status: 409,
      description:
         'A project (live or in the trash) still uses the file as thumbnail or media, or another ' +
         'change of it is in progress',
   })
   async removePermanently(@Param('id', ParseIntPipe) id: number) {
      await this.fileService.removePermanently(id);
   }
}
