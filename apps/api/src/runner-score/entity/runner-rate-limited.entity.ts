import { ApiPropertyOptional } from '@nestjs/swagger';

import { ErrorResponseDto } from '@/common/dto/error-response.dto';

export class RunnerRateLimitedEntity extends ErrorResponseDto {
   @ApiPropertyOptional({
      description:
         'Seconds until the address may try again; missing when the global request limit answered',
      example: 120,
   })
   retryAfterSeconds?: number;
}
