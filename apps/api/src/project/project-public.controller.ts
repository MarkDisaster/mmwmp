import { Controller, Get, Param, ParseBoolPipe, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AcceptLanguage } from '@/common/decorators/accept-language.decorator';
import { PreviewMode } from '@/common/decorators/preview-mode.decorator';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { SlugRedirectEntity } from '@/common/dto/slug-redirect.dto';
import type { Language } from '@/generated/prisma/enums';
import { PUBLIC_READ_THROTTLE } from '@/rate-limit/throttle-limits';

import { PublicProjectEntity } from './entity/public-project.entity';
import { ProjectService } from './project.service';

@ApiTags('Public Projects')
@Throttle({ default: PUBLIC_READ_THROTTLE })
@Controller('public/projects')
export class ProjectPublicController {
   constructor(private projectService: ProjectService) {}

   @Get()
   @ApiOperation({ summary: 'List all published projects' })
   @ApiPaginatedResponse(PublicProjectEntity)
   @ApiHeader({ name: 'Accept-Language', required: false, description: 'Language (cs/en)' })
   @ApiQuery({
      name: 'homepageOnly',
      required: false,
      type: Boolean,
      description: 'Return only projects with showOnHomepage = true',
   })
   findAllPublished(
      @Query() query: PaginationQueryDto,
      @AcceptLanguage() language?: Language,
      @Query('homepageOnly', new ParseBoolPipe({ optional: true })) homepageOnly = false,
   ) {
      return this.projectService.findAllPublished(query, language, homepageOnly);
   }

   @Get('redirect/:slug')
   @ApiOperation({
      summary: 'Current slug of a project that was renamed',
      description:
         'When a published project changes its slug, the old one redirects to the current one. ' +
         'The web calls this when `:slug` is not found and answers 308 to the returned slug.',
   })
   @ApiResponse({ status: 200, description: 'The current slug', type: SlugRedirectEntity })
   @ApiResponse({ status: 404, description: 'No redirect leads to a published project' })
   findRedirect(@Param('slug') slug: string) {
      return this.projectService.findRedirect(slug);
   }

   @Get(':slug')
   @ApiOperation({ summary: 'Get project by slug (preview mode returns drafts)' })
   @ApiResponse({ status: 200, description: 'Project detail', type: PublicProjectEntity })
   @ApiResponse({ status: 404, description: 'Project not found' })
   @ApiHeader({ name: 'Accept-Language', required: false, description: 'Language (cs/en)' })
   @ApiHeader({
      name: 'Authorization',
      required: false,
      description: 'Bearer PREVIEW_API_TOKEN for draft access (server-only token of the web)',
   })
   findBySlug(
      @Param('slug') slug: string,
      @AcceptLanguage() language?: Language,
      @PreviewMode() preview?: boolean,
   ) {
      return this.projectService.findBySlug(slug, language, preview);
   }
}
