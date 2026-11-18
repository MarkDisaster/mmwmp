import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { ApiPaginatedResponse } from '@/common/dto/paginated-response.dto';
import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { PUBLIC_READ_THROTTLE } from '@/rate-limit/throttle-limits';

import { PublicTagEntity } from './entity/public-tag.entity';
import { TagService } from './tag.service';

@ApiTags('Public Tags')
@Throttle({ default: PUBLIC_READ_THROTTLE })
@Controller('public/tags')
export class TagPublicController {
   constructor(private tagService: TagService) {}

   @Get()
   @ApiOperation({ summary: 'Get all public tags' })
   @ApiPaginatedResponse(PublicTagEntity)
   findAll(@Query() query: PaginationQueryDto) {
      return this.tagService.findAllPublic(query);
   }
}
