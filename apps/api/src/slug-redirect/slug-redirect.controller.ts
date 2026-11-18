import {
   Controller,
   Delete,
   Get,
   HttpCode,
   HttpStatus,
   Param,
   ParseIntPipe,
   Query,
   UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import {
   PermissionAction,
   PermissionResource,
   SlugRedirectResource,
} from '@/generated/prisma/enums';

import { AdminSlugRedirectEntity } from './entity/slug-redirect.entity';
import { SlugRedirectService } from './slug-redirect.service';

@ApiTags('Slug redirects')
@Controller('slug-redirects')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class SlugRedirectController {
   constructor(private readonly slugRedirects: SlugRedirectService) {}

   @Get('projects')
   @RequirePermission(PermissionResource.projects, PermissionAction.read)
   @ApiOperation({ summary: 'List the former slugs of projects that redirect to the current one' })
   @ApiPaginatedResponse(AdminSlugRedirectEntity)
   findProjects(@Query() query: PaginationQueryDto) {
      return this.slugRedirects.findAll(SlugRedirectResource.project, query);
   }

   @Get('services')
   @RequirePermission(PermissionResource.services, PermissionAction.read)
   @ApiOperation({ summary: 'List the former slugs of services that redirect to the current one' })
   @ApiPaginatedResponse(AdminSlugRedirectEntity)
   findServices(@Query() query: PaginationQueryDto) {
      return this.slugRedirects.findAll(SlugRedirectResource.service, query);
   }

   @Delete('projects/:id')
   @AuditAction('slugRedirect.delete', 'slugRedirect')
   @RequirePermission(PermissionResource.projects, PermissionAction.publish)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Delete a project slug redirect',
      description: 'The old address answers 404 from now on. Not restorable.',
   })
   @ApiResponse({ status: 204, description: 'Redirect deleted' })
   @ApiResponse({ status: 404, description: 'Redirect not found' })
   async removeProject(@Param('id', ParseIntPipe) id: number) {
      await this.slugRedirects.remove(SlugRedirectResource.project, id);
   }

   @Delete('services/:id')
   @AuditAction('slugRedirect.delete', 'slugRedirect')
   @RequirePermission(PermissionResource.services, PermissionAction.publish)
   @HttpCode(HttpStatus.NO_CONTENT)
   @ApiOperation({
      summary: 'Delete a service slug redirect',
      description: 'The old address answers 404 from now on. Not restorable.',
   })
   @ApiResponse({ status: 204, description: 'Redirect deleted' })
   @ApiResponse({ status: 404, description: 'Redirect not found' })
   async removeService(@Param('id', ParseIntPipe) id: number) {
      await this.slugRedirects.remove(SlugRedirectResource.service, id);
   }
}
