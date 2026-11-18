import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { ErrorResponseDto } from '@/common/dto/error-response.dto';

export type SaveErrorDescriptions = { badRequest: string; forbidden: string; notFound: string };

export const BUSY_CONFLICT =
   'Another change of the same data is in progress (`code` CONCURRENT_CHANGE or BUSY, try again)';

export const SLUG_OR_BUSY_CONFLICT =
   'The slug is taken (`code` SLUG_TAKEN), or another change of the same data is in progress ' +
   '(`code` CONCURRENT_CHANGE or BUSY, try again)';

export const ApiVersionConflictResponse = (otherCauses?: string) =>
   ApiResponse({
      status: 409,
      description: [
         otherCauses,
         '`code` VERSION_CONFLICT: the record changed since the `version` sent (the stored one ' +
            'is in `currentVersion`; reload it)',
      ]
         .filter(Boolean)
         .join('; '),
      type: ErrorResponseDto,
   });

export const ApiSaveErrorResponses = ({ badRequest, forbidden, notFound }: SaveErrorDescriptions) =>
   applyDecorators(
      ApiResponse({ status: 400, description: badRequest, type: ErrorResponseDto }),
      ApiResponse({ status: 401, description: 'Not signed in', type: ErrorResponseDto }),
      ApiResponse({ status: 403, description: forbidden, type: ErrorResponseDto }),
      ApiResponse({ status: 404, description: notFound, type: ErrorResponseDto }),
      ApiVersionConflictResponse(SLUG_OR_BUSY_CONFLICT),
   );
