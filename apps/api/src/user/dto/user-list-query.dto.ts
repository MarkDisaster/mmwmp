import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

const USER_LIST_STATUSES = ['all', 'active', 'deactivated'] as const;
export type UserListStatus = (typeof USER_LIST_STATUSES)[number];

export class UserListQueryDto extends PaginationQueryDto {
   @ApiPropertyOptional({
      description:
         'Which accounts to list: `all` (default, deactivated ones included so the admin sees them ' +
         'and can reactivate them), `active` or `deactivated`',
      enum: USER_LIST_STATUSES,
      default: 'all',
   })
   @IsOptional()
   @IsIn(USER_LIST_STATUSES)
   status: UserListStatus = 'all';
}
