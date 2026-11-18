import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiVersionConflictResponse } from '@/common/decorators/api-save-error-responses.decorator';
import type { OrderLabel } from '@/common/sort/ordered-table';

export const ApiMoveEndpoint = (entity: Lowercase<OrderLabel>) => {
   const label = entity.charAt(0).toUpperCase() + entity.slice(1);
   return applyDecorators(
      ApiOperation({ summary: `Place a ${entity} directly before or after another one` }),
      ApiResponse({ status: 204, description: `${label} moved` }),
      ApiResponse({
         status: 400,
         description: `Invalid body, the target does not exist or is the ${entity} itself`,
      }),
      ApiResponse({ status: 404, description: `${label} not found` }),
      ApiVersionConflictResponse(),
   );
};
