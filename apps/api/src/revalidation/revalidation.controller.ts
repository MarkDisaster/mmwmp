import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { RevalidateWebsiteDto } from './dto/revalidate-website.dto';
import { RevalidationService } from './revalidation.service';

@ApiTags('Revalidation')
@Controller('revalidation')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class RevalidationController {
   constructor(private readonly revalidation: RevalidationService) {}

   @Post()
   @AuditAction('website.revalidate', 'website')
   @RequirePermission(PermissionResource.projects, PermissionAction.publish)
   @HttpCode(HttpStatus.OK)
   @ApiOperation({
      summary: 'Refresh the cache of the public web',
      description:
         'Calls the web `/api/revalidate` for each tag now and reports per tag whether the web ' +
         'accepted it. The BE does the same, debounced, after every content change.',
   })
   @ApiResponse({ status: 200, description: 'Result per tag (a failed tag has a `reason`)' })
   async revalidate(@Body() dto: RevalidateWebsiteDto) {
      return { results: await this.revalidation.revalidateNow(dto.tags) };
   }
}
