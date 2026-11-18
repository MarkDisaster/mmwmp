import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { PUBLIC_READ_THROTTLE } from '@/rate-limit/throttle-limits';

import { ContactService } from './contact.service';
import { PublicContactEntity } from './entity/public-contact.entity';

@ApiTags('Public - Contact')
@Throttle({ default: PUBLIC_READ_THROTTLE })
@Controller('public/contact')
export class ContactPublicController {
   constructor(private contactService: ContactService) {}

   @Get()
   @ApiOperation({ summary: 'Get public contact info' })
   @ApiResponse({ status: 200, description: 'Contact info', type: PublicContactEntity })
   find() {
      return this.contactService.findPublic();
   }
}
