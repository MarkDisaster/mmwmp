import { Controller, Get, Param, ParseBoolPipe, Query } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AcceptLanguage } from '@/common/decorators/accept-language.decorator';
import { PreviewMode } from '@/common/decorators/preview-mode.decorator';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { SlugRedirectEntity } from '@/common/dto/slug-redirect.dto';
import { Language } from '@/generated/prisma/enums';
import { PUBLIC_READ_THROTTLE } from '@/rate-limit/throttle-limits';

import { PublicServiceEntity } from './entity/public-service.entity';
import { ServiceService } from './service.service';

@ApiTags('Public Services')
@Throttle({ default: PUBLIC_READ_THROTTLE })
@Controller('public/services')
export class ServicePublicController {
   constructor(private serviceService: ServiceService) {}

   @Get()
   @ApiOperation({ summary: 'List all published services (preview mode includes drafts)' })
   @ApiPaginatedResponse(PublicServiceEntity)
   @ApiHeader({ name: 'Accept-Language', required: false, description: 'Language (cs/en)' })
   @ApiHeader({
      name: 'Authorization',
      required: false,
      description: 'Bearer PREVIEW_API_TOKEN for draft access (server-only token of the web)',
   })
   @ApiQuery({
      name: 'homepageOnly',
      required: false,
      type: Boolean,
      description: 'Return only services with showOnHomepage = true',
   })
   findAllPublished(
      @Query() query: PaginationQueryDto,
      @AcceptLanguage() language?: Language,
      @Query('homepageOnly', new ParseBoolPipe({ optional: true })) homepageOnly = false,
      @PreviewMode() preview?: boolean,
   ) {
      return this.serviceService.findAllPublished(query, language, homepageOnly, preview);
   }

   @Get('redirect/:slug')
   @ApiOperation({
      summary: 'Current slug of a service that was renamed',
      description:
         'When a published service changes its slug, the old one redirects to the current one. ' +
         'The web calls this when `:slug` is not found and answers 308 to the returned slug.',
   })
   @ApiResponse({ status: 200, description: 'The current slug', type: SlugRedirectEntity })
   @ApiResponse({ status: 404, description: 'No redirect leads to a published service' })
   findRedirect(@Param('slug') slug: string) {
      return this.serviceService.findRedirect(slug);
   }

   @Get(':slug')
   @ApiOperation({ summary: 'Get service by slug (preview mode returns drafts)' })
   @ApiResponse({ status: 200, description: 'Service detail', type: PublicServiceEntity })
   @ApiResponse({ status: 404, description: 'Service not found' })
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
      return this.serviceService.findBySlug(slug, language, preview);
   }
}
