import {
   Body,
   Controller,
   Delete,
   Get,
   HttpCode,
   HttpStatus,
   Param,
   ParseEnumPipe,
   ParseIntPipe,
   Patch,
   Post,
   Put,
   Query,
   UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { MAX_TRANSLATION_SOURCE_LENGTH } from '@/ai/translation';
import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { RICH_TEXT_KEYS } from '@/audit/redact';
import { ApiMoveEndpoint } from '@/common/decorators/api-move-endpoint.decorator';
import {
   ApiSaveErrorResponses,
   ApiVersionConflictResponse,
   BUSY_CONFLICT,
   SLUG_OR_BUSY_CONFLICT,
} from '@/common/decorators/api-save-error-responses.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { MoveItemDto } from '@/common/dto/move-item.dto';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { StatusFilterQueryDto } from '@/common/dto/status-filter-query.dto';
import { UpdateStatusDto } from '@/common/dto/update-status.dto';
import { type AuthenticatedUser, AuthGuard } from '@/common/guards/auth.guard';
import { toSaveActor } from '@/common/save/save-actor';
import { TrashedItemEntity } from '@/common/trash/trashed-item.entity';
import { Language, PermissionAction, PermissionResource } from '@/generated/prisma/enums';
import { PreviewService } from '@/preview/preview.service';

import { AssignProjectsDto } from './dto/assign-projects.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { GenerateServiceTranslationRequestDto } from './dto/generate-service-translation-request.dto';
import { GenerateServiceTranslationResponseDto } from './dto/generate-service-translation-response.dto';
import { SaveServiceDto } from './dto/save-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { UpsertServiceTranslationDto } from './dto/upsert-service-translation.dto';
import { ServiceEntity } from './entity/service.entity';
import { ServiceTranslationEntity } from './entity/service-translation.entity';
import { ServiceService } from './service.service';

@ApiTags('Services')
@Controller('services')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ServiceController {
   constructor(
      private serviceService: ServiceService,
      private previewService: PreviewService,
   ) {}

   @Post()
   @AuditAction('service.create', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.create)
   @ApiOperation({ summary: 'Create a new service with initial translation' })
   @ApiResponse({ status: 201, description: 'Service created', type: ServiceEntity })
   @ApiResponse({ status: 409, description: 'A service with this slug already exists' })
   create(@Body() dto: CreateServiceDto) {
      return this.serviceService.create(dto);
   }

   @Post('save')
   @AuditAction('service.saveNew', 'service', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.services, PermissionAction.create)
   @ApiOperation({
      summary: 'Create a service with the whole editor state in one transaction',
      description:
         'Slug, homepage flag, status, translations and projects are stored together or not at ' +
         'all. A status other than draft needs the publish permission.',
   })
   @ApiResponse({ status: 201, description: 'Service created', type: ServiceEntity })
   @ApiSaveErrorResponses({
      badRequest: 'Invalid body or no translation with a title',
      forbidden: 'Missing the create permission, or the publish permission for the status',
      notFound: 'One or more projects could not be found',
   })
   saveNew(@Body() dto: SaveServiceDto, @CurrentUser() user: AuthenticatedUser) {
      return this.serviceService.saveNew(dto, toSaveActor(user, PermissionResource.services));
   }

   @Put(':id/save')
   @AuditAction('service.save', 'service', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @ApiOperation({
      summary: 'Replace the whole editor state of a service in one transaction',
      description:
         'Slug, homepage flag, status, translations and projects are stored together or not at ' +
         'all. Changing the status needs the publish permission. Overlapping writes of one ' +
         'service run one after another. With `version`, a save based on an older one is a 409 ' +
         'VERSION_CONFLICT (so is a retry of a save whose answer was lost: the save raised the ' +
         'version); without it the last save wins as a whole and sending the same state again ' +
         'leaves the same service.',
   })
   @ApiResponse({ status: 200, description: 'Service saved', type: ServiceEntity })
   @ApiSaveErrorResponses({
      badRequest: 'Invalid body or no translation with a title',
      forbidden: 'Missing the update permission, or the publish permission for a status change',
      notFound: 'Service or one of the projects not found',
   })
   save(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: SaveServiceDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.save(id, dto, toSaveActor(user, PermissionResource.services));
   }

   @Get()
   @RequirePermission(PermissionResource.services, PermissionAction.read)
   @ApiOperation({ summary: 'List all services' })
   @ApiPaginatedResponse(ServiceEntity)
   findAll(@Query() query: StatusFilterQueryDto) {
      return this.serviceService.findAll(query);
   }

   @Get(':id/preview-url')
   @RequirePermission(PermissionResource.services, PermissionAction.read)
   @ApiOperation({
      summary: 'Get preview URL for service',
      description:
         'The link opens the draft of this service in this language and expires after 5 minutes, ' +
         'so ask for a new one for each preview.',
   })
   @ApiResponse({ status: 200, description: 'Preview URL' })
   @ApiResponse({ status: 404, description: 'Service not found' })
   async getPreviewUrl(@Param('id', ParseIntPipe) id: number, @Query('locale') locale?: string) {
      const service = await this.serviceService.findOne(id);
      return { previewUrl: this.previewService.getPreviewUrl('services', service, locale ?? 'cs') };
   }

   @Get('trash')
   @RequirePermission(PermissionResource.services, PermissionAction.delete)
   @ApiOperation({
      summary: 'List the services in the trash',
      description:
         'Most recently deleted first. Purged automatically after the retention (30 days).',
   })
   @ApiPaginatedResponse(TrashedItemEntity)
   findTrashed(@Query() query: PaginationQueryDto) {
      return this.serviceService.findTrashed(query);
   }

   @Get(':id')
   @RequirePermission(PermissionResource.services, PermissionAction.read)
   @ApiOperation({ summary: 'Get service by ID' })
   @ApiResponse({
      status: 200,
      description: 'Service detail with translations',
      type: ServiceEntity,
   })
   @ApiResponse({ status: 404, description: 'Service not found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
      return this.serviceService.findOne(id);
   }

   @Patch(':id')
   @AuditAction('service.update', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @ApiOperation({ summary: 'Update service (slug, homepage visibility)' })
   @ApiResponse({ status: 200, description: 'Service updated', type: ServiceEntity })
   @ApiResponse({ status: 404, description: 'Service not found' })
   @ApiVersionConflictResponse(SLUG_OR_BUSY_CONFLICT)
   update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateServiceDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.update(id, dto, toSaveActor(user, PermissionResource.services));
   }

   @Post(':id/move')
   @AuditAction('service.move', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiMoveEndpoint('service')
   move(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: MoveItemDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.move(id, dto, toSaveActor(user, PermissionResource.services));
   }

   @Patch(':id/status')
   @AuditAction('service.updateStatus', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.publish)
   @ApiOperation({ summary: 'Publish or unpublish a service' })
   @ApiResponse({ status: 200, description: 'Service status updated', type: ServiceEntity })
   @ApiResponse({ status: 404, description: 'Service not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
      return this.serviceService.updateStatus(id, dto);
   }

   @Delete(':id')
   @AuditAction('service.trash', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Move a service to the trash',
      description:
         'The service disappears from the lists and the web at once and can be restored from the ' +
         'trash (`POST :id/restore`) until it is purged (30 days). Its slug is free for a new service.',
   })
   @ApiResponse({ status: 204, description: 'Service moved to the trash' })
   @ApiResponse({ status: 404, description: 'Service not found' })
   remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
      return this.serviceService.trash(id, user.id);
   }

   @Post(':id/restore')
   @AuditAction('service.restore', 'service')
   @HttpCode(HttpStatus.OK)
   @RequirePermission(PermissionResource.services, PermissionAction.delete)
   @ApiOperation({
      summary: 'Restore a service from the trash',
      description:
         'Returns it as a draft (a published service is not published again silently), at the end of the order.',
   })
   @ApiResponse({ status: 200, description: 'Restored', type: ServiceEntity })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   @ApiResponse({ status: 409, description: 'The original slug or name is taken now' })
   restore(@Param('id', ParseIntPipe) id: number) {
      return this.serviceService.restore(id);
   }

   @Delete(':id/permanent')
   @AuditAction('service.deletePermanently', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Delete a service in the trash for good',
      description: 'Only for a service that is in the trash. Irreversible.',
   })
   @ApiResponse({ status: 204, description: 'Deleted for good' })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   async removePermanently(@Param('id', ParseIntPipe) id: number) {
      await this.serviceService.removePermanently(id);
   }

   @Post(':id/translations/:language')
   @AuditAction('service.upsertTranslation', 'service', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @ApiOperation({ summary: 'Create or update service translation' })
   @ApiParam({ name: 'language', enum: Language })
   @ApiResponse({
      status: 201,
      description: 'Translation created or updated',
      type: ServiceTranslationEntity,
   })
   @ApiResponse({ status: 404, description: 'Service not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   upsertTranslation(
      @Param('id', ParseIntPipe) id: number,
      @Param('language', new ParseEnumPipe(Language)) language: Language,
      @Body() dto: UpsertServiceTranslationDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.upsertTranslation(
         id,
         language,
         dto,
         toSaveActor(user, PermissionResource.services),
      );
   }

   @Post(':id/translations/:language/generate')
   @AuditAction('service.generateTranslation', 'service', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @ApiOperation({ summary: 'Generate AI translation for a service (preview only, does not save)' })
   @ApiParam({ name: 'language', enum: Language })
   @ApiResponse({
      status: 201,
      description: 'Generated translation fields (not saved)',
      type: GenerateServiceTranslationResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: `Invalid request, or the source fields together exceed ${MAX_TRANSLATION_SOURCE_LENGTH} characters`,
   })
   @ApiResponse({ status: 404, description: 'Service not found or no source translation' })
   @ApiResponse({
      status: 429,
      description: 'Translation limit of the user exceeded (shared with the AI tools)',
   })
   @ApiResponse({ status: 504, description: 'The translation model did not respond in time' })
   generateTranslation(
      @Param('id', ParseIntPipe) id: number,
      @Param('language', new ParseEnumPipe(Language)) language: Language,
      @Body() dto: GenerateServiceTranslationRequestDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.generateTranslation(id, language, dto, user.id);
   }

   @Delete(':id/translations/:language')
   @AuditAction('service.deleteTranslation', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ summary: 'Delete service translation' })
   @ApiParam({ name: 'language', enum: Language })
   @ApiResponse({ status: 204, description: 'Translation deleted' })
   @ApiResponse({
      status: 400,
      description: 'The last translation with a title: the service would have no title',
   })
   @ApiResponse({ status: 404, description: 'Service or translation not found' })
   deleteTranslation(
      @Param('id', ParseIntPipe) id: number,
      @Param('language', new ParseEnumPipe(Language)) language: Language,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.deleteTranslation(
         id,
         language,
         toSaveActor(user, PermissionResource.services),
      );
   }

   @Post(':id/projects')
   @AuditAction('service.assignProjects', 'service')
   @RequirePermission(PermissionResource.services, PermissionAction.update)
   @ApiOperation({ summary: 'Assign projects to service (replaces existing)' })
   @ApiResponse({ status: 201, description: 'Projects assigned', type: ServiceEntity })
   @ApiResponse({ status: 404, description: 'Service or project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   assignProjects(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: AssignProjectsDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.serviceService.assignProjects(
         id,
         dto,
         toSaveActor(user, PermissionResource.services),
      );
   }
}
