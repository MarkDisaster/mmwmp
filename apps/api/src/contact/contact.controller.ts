import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AuditAction } from '@/audit/decorators/audit-action.decorator';
import { ApiVersionConflictResponse } from '@/common/decorators/api-save-error-responses.decorator';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PermissionAction, PermissionResource } from '@/generated/prisma/enums';

import { ContactService } from './contact.service';
import { UpsertContactDto } from './dto/upsert-contact.dto';
import { ContactEntity } from './entity/contact.entity';

@ApiTags('Contact')
@Controller('contact')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class ContactController {
   constructor(private contactService: ContactService) {}

   @Get()
   @RequirePermission(PermissionResource.contact, PermissionAction.read)
   @ApiOperation({ summary: 'Get contact info' })
   @ApiResponse({ status: 200, description: 'Contact info', type: ContactEntity })
   find() {
      return this.contactService.find();
   }

   @Put()
   @AuditAction('contact.upsert', 'contact')
   @RequirePermission(PermissionResource.contact, PermissionAction.update)
   @ApiOperation({ summary: 'Upsert contact info' })
   @ApiResponse({ status: 200, description: 'Contact updated', type: ContactEntity })
   @ApiVersionConflictResponse()
   upsert(@Body() dto: UpsertContactDto) {
      return this.contactService.upsert(dto);
   }
}
