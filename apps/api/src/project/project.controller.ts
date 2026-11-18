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
import {
   ApiBearerAuth,
   ApiOkResponse,
   ApiOperation,
   ApiParam,
   ApiResponse,
   ApiTags,
} from '@nestjs/swagger';

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

import { AddProjectMediaDto } from './dto/add-project-media.dto';
import { AssignProjectLinksDto } from './dto/assign-project-links.dto';
import { AssignTagsDto } from './dto/assign-tags.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { GenerateProjectTranslationRequestDto } from './dto/generate-translation-request.dto';
import { GenerateProjectTranslationResponseDto } from './dto/generate-translation-response.dto';
import { SaveProjectDto } from './dto/save-project.dto';
import { SortProjectMediaDto } from './dto/sort-project-media.dto';
import { SortProjectTagsDto } from './dto/sort-project-tags.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';
import { ProjectEntity } from './entity/project.entity';
import { ProjectPreviewUrlEntity } from './entity/project-preview-url.entity';
import { ProjectTranslationEntity } from './entity/project-translation.entity';
import { ProjectService } from './project.service';

const SAVE_ERROR_DESCRIPTIONS = {
   badRequest: 'Invalid body (also: no translation with a title, years, unknown media row)',
   forbidden: 'Missing the permission, or the publish permission for a change of the status',
   notFound: 'Project, thumbnail, file or tag not found',
};

@ApiTags('Projects')
@Controller('projects')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ProjectController {
   constructor(
      private projectService: ProjectService,
      private previewService: PreviewService,
   ) {}

   @Post()
   @AuditAction('project.create', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.create)
   @ApiOperation({ summary: 'Create a new project with initial translation' })
   @ApiResponse({ status: 201, description: 'Project created', type: ProjectEntity })
   create(@CurrentUser('id') createdById: number, @Body() dto: CreateProjectDto) {
      return this.projectService.create(createdById, dto);
   }

   @Post('save')
   @AuditAction('project.saveNew', 'project', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.projects, PermissionAction.create)
   @ApiOperation({
      summary: 'Create a project from the whole editor form in one transaction',
      description:
         'Project fields, translations, tags, links, media and optionally the status are stored ' +
         'together or not at all. Not idempotent: a repeated request answers 409 (slug taken). ' +
         'A status other than draft needs the publish permission.',
   })
   @ApiResponse({ status: 201, description: 'Project created', type: ProjectEntity })
   @ApiSaveErrorResponses(SAVE_ERROR_DESCRIPTIONS)
   saveNew(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveProjectDto) {
      return this.projectService.saveNew(dto, toSaveActor(user, PermissionResource.projects));
   }

   @Put(':id/save')
   @AuditAction('project.save', 'project', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({
      summary: 'Replace the editable state of a project from the whole editor form',
      description:
         'Applied in one transaction (all or nothing). Tags, links and media are replaced by the ' +
         'lists in the body (media rows not listed are removed); translations with a title are ' +
         'created or replaced, other languages are kept. Changing the status needs the publish ' +
         'permission. Overlapping writes of one project run one after the other. With `version`, ' +
         'a save based on an older one is a 409 VERSION_CONFLICT (so is a retry of a save whose ' +
         'answer was lost: the save raised the version); without it the later save wins as a ' +
         'whole and sending the same body again leaves the same state.',
   })
   @ApiResponse({ status: 200, description: 'Project saved', type: ProjectEntity })
   @ApiSaveErrorResponses(SAVE_ERROR_DESCRIPTIONS)
   saveExisting(
      @Param('id', ParseIntPipe) id: number,
      @CurrentUser() user: AuthenticatedUser,
      @Body() dto: SaveProjectDto,
   ) {
      return this.projectService.saveExisting(
         id,
         dto,
         toSaveActor(user, PermissionResource.projects),
      );
   }

   @Get()
   @RequirePermission(PermissionResource.projects, PermissionAction.read)
   @ApiOperation({ summary: 'List all projects' })
   @ApiPaginatedResponse(ProjectEntity)
   findAll(@Query() query: StatusFilterQueryDto) {
      return this.projectService.findAll(query);
   }

   @Get('trash')
   @RequirePermission(PermissionResource.projects, PermissionAction.delete)
   @ApiOperation({
      summary: 'List the projects in the trash',
      description:
         'Most recently deleted first. Purged automatically after the retention (30 days).',
   })
   @ApiPaginatedResponse(TrashedItemEntity)
   findTrashed(@Query() query: PaginationQueryDto) {
      return this.projectService.findTrashed(query);
   }

   @Get(':id/preview-url')
   @RequirePermission(PermissionResource.projects, PermissionAction.read)
   @ApiOperation({
      summary: 'Get preview URL for project',
      description:
         'The link opens the draft of this project in this language and expires after 5 minutes, ' +
         'so ask for a new one for each preview.',
   })
   @ApiOkResponse({ description: 'Preview URL', type: ProjectPreviewUrlEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   async getPreviewUrl(
      @Param('id', ParseIntPipe) id: number,
      @Query('locale') locale?: string,
   ): Promise<ProjectPreviewUrlEntity> {
      const project = await this.projectService.findOne(id);
      return { previewUrl: this.previewService.getPreviewUrl('projects', project, locale ?? 'cs') };
   }

   @Get(':id')
   @RequirePermission(PermissionResource.projects, PermissionAction.read)
   @ApiOperation({ summary: 'Get project by ID' })
   @ApiResponse({
      status: 200,
      description: 'Project detail with translations, tags, thumbnail',
      type: ProjectEntity,
   })
   @ApiResponse({ status: 404, description: 'Project not found' })
   findOne(@Param('id', ParseIntPipe) id: number) {
      return this.projectService.findOne(id);
   }

   @Patch(':id')
   @AuditAction('project.update', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({
      summary: 'Update project (slug, thumbnail, company, years, homepage visibility)',
   })
   @ApiResponse({ status: 200, description: 'Project updated', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(SLUG_OR_BUSY_CONFLICT)
   update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateProjectDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.update(id, dto, toSaveActor(user, PermissionResource.projects));
   }

   @Post(':id/move')
   @AuditAction('project.move', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiMoveEndpoint('project')
   move(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: MoveItemDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.move(id, dto, toSaveActor(user, PermissionResource.projects));
   }

   @Patch(':id/status')
   @AuditAction('project.updateStatus', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.publish)
   @ApiOperation({ summary: 'Publish or unpublish a project' })
   @ApiResponse({ status: 200, description: 'Project status updated', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStatusDto) {
      return this.projectService.updateStatus(id, dto);
   }

   @Delete(':id')
   @AuditAction('project.trash', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Move a project to the trash',
      description:
         'The project disappears from the lists and the web at once and can be restored from the ' +
         'trash (`POST :id/restore`) until it is purged (30 days). Its slug is free for a new project.',
   })
   @ApiResponse({ status: 204, description: 'Project moved to the trash' })
   @ApiResponse({ status: 404, description: 'Project not found' })
   remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
      return this.projectService.trash(id, user.id);
   }

   @Post(':id/restore')
   @AuditAction('project.restore', 'project')
   @HttpCode(HttpStatus.OK)
   @RequirePermission(PermissionResource.projects, PermissionAction.delete)
   @ApiOperation({
      summary: 'Restore a project from the trash',
      description:
         'Returns it as a draft (a published project is not published again silently), at the end of the order.',
   })
   @ApiResponse({ status: 200, description: 'Restored', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   @ApiResponse({ status: 409, description: 'The original slug or name is taken now' })
   restore(@Param('id', ParseIntPipe) id: number) {
      return this.projectService.restore(id);
   }

   @Delete(':id/permanent')
   @AuditAction('project.deletePermanently', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.delete)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Delete a project in the trash for good',
      description: 'Only for a project that is in the trash. Irreversible.',
   })
   @ApiResponse({ status: 204, description: 'Deleted for good' })
   @ApiResponse({ status: 404, description: 'Not in the trash' })
   async removePermanently(@Param('id', ParseIntPipe) id: number) {
      await this.projectService.removePermanently(id);
   }

   @Post(':id/translations/:language')
   @AuditAction('project.upsertTranslation', 'project', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({ summary: 'Create or update project translation' })
   @ApiParam({ name: 'language', enum: Language })
   @ApiResponse({
      status: 201,
      description: 'Translation created or updated',
      type: ProjectTranslationEntity,
   })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   upsertTranslation(
      @Param('id', ParseIntPipe) id: number,
      @Param('language', new ParseEnumPipe(Language)) language: Language,
      @Body() dto: UpsertTranslationDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.upsertTranslation(
         id,
         language,
         dto,
         toSaveActor(user, PermissionResource.projects),
      );
   }

   @Post(':id/translations/:language/generate')
   @AuditAction('project.generateTranslation', 'project', { summarize: RICH_TEXT_KEYS })
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({ summary: 'Generate AI translation for a project (preview only, does not save)' })
   @ApiParam({ name: 'language', enum: Language })
   @ApiResponse({
      status: 201,
      description: 'Generated translation fields (not saved)',
      type: GenerateProjectTranslationResponseDto,
   })
   @ApiResponse({
      status: 400,
      description: `Invalid request, or the source fields together exceed ${MAX_TRANSLATION_SOURCE_LENGTH} characters`,
   })
   @ApiResponse({ status: 404, description: 'Project not found or no source translation' })
   @ApiResponse({
      status: 429,
      description: 'Translation limit of the user exceeded (shared with the AI tools)',
   })
   @ApiResponse({ status: 504, description: 'The translation model did not respond in time' })
   generateTranslation(
      @Param('id', ParseIntPipe) id: number,
      @Param('language', new ParseEnumPipe(Language)) language: Language,
      @Body() dto: GenerateProjectTranslationRequestDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.generateTranslation(id, language, dto, user.id);
   }

   @Delete(':id/translations/:language')
   @AuditAction('project.deleteTranslation', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ summary: 'Delete project translation' })
   @ApiParam({ name: 'language', enum: Language })
   @ApiResponse({ status: 204, description: 'Translation deleted' })
   @ApiResponse({
      status: 400,
      description: 'The last translation with a title: the project would have no title',
   })
   @ApiResponse({ status: 404, description: 'Project or translation not found' })
   deleteTranslation(
      @Param('id', ParseIntPipe) id: number,
      @Param('language', new ParseEnumPipe(Language)) language: Language,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.deleteTranslation(
         id,
         language,
         toSaveActor(user, PermissionResource.projects),
      );
   }

   @Post(':id/media')
   @AuditAction('project.addMedia', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({ summary: 'Add file to project' })
   @ApiResponse({ status: 201, description: 'Media added to project', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   addMedia(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: AddProjectMediaDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.addMedia(id, dto, toSaveActor(user, PermissionResource.projects));
   }

   @Delete(':id/media/:mediaId')
   @AuditAction('project.removeMedia', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ summary: 'Remove file from project' })
   @ApiResponse({ status: 204, description: 'Media removed' })
   @ApiResponse({ status: 404, description: 'Project or media not found' })
   removeMedia(
      @Param('id', ParseIntPipe) id: number,
      @Param('mediaId', ParseIntPipe) mediaId: number,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.removeMedia(
         id,
         mediaId,
         toSaveActor(user, PermissionResource.projects),
      );
   }

   @Put(':id/media/sort')
   @AuditAction('project.sortMedia', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({ summary: 'Reorder project media' })
   @ApiResponse({ status: 200, description: 'Media reordered', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   sortMedia(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: SortProjectMediaDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.sortMedia(id, dto, toSaveActor(user, PermissionResource.projects));
   }

   @Put(':id/links')
   @AuditAction('project.assignLinks', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({
      summary:
         'Set project links (replaces existing, array order = display order, first = main link)',
   })
   @ApiResponse({ status: 200, description: 'Links saved', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   assignLinks(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: AssignProjectLinksDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.assignLinks(
         id,
         dto,
         toSaveActor(user, PermissionResource.projects),
      );
   }

   @Post(':id/tags')
   @AuditAction('project.assignTags', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({ summary: 'Assign tags to project (replaces existing)' })
   @ApiResponse({ status: 201, description: 'Tags assigned', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   assignTags(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: AssignTagsDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.assignTags(
         id,
         dto,
         toSaveActor(user, PermissionResource.projects),
      );
   }

   @Put(':id/tags/sort')
   @AuditAction('project.sortTags', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @ApiOperation({ summary: 'Reorder project tags' })
   @ApiResponse({ status: 200, description: 'Tags reordered', type: ProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiVersionConflictResponse(BUSY_CONFLICT)
   sortTags(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: SortProjectTagsDto,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.sortTags(id, dto, toSaveActor(user, PermissionResource.projects));
   }

   @Delete(':id/tags/:tagId')
   @AuditAction('project.removeTag', 'project')
   @RequirePermission(PermissionResource.projects, PermissionAction.update)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({ summary: 'Remove tag from project' })
   @ApiResponse({ status: 204, description: 'Tag removed' })
   @ApiResponse({ status: 404, description: 'Project or tag not found' })
   removeTag(
      @Param('id', ParseIntPipe) id: number,
      @Param('tagId', ParseIntPipe) tagId: number,
      @CurrentUser() user: AuthenticatedUser,
   ) {
      return this.projectService.removeTag(
         id,
         tagId,
         toSaveActor(user, PermissionResource.projects),
      );
   }
}
