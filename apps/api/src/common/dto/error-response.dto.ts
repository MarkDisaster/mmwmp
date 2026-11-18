import { ApiProperty } from '@nestjs/swagger';

import { ApiErrorCode } from '@/common/enum/api-error-code.enum';

export class ErrorResponseDto {
   @ApiProperty({ description: 'HTTP status code', example: 409 })
   statusCode!: number;

   @ApiProperty({
      description: 'What went wrong; the validation pipe sends one message per invalid field',
      oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
   })
   message!: string | string[];

   @ApiProperty({ description: 'Name of the HTTP status', required: false, example: 'Conflict' })
   error?: string;

   @ApiProperty({
      description:
         'Machine-readable reason of the error, for answers a client tells apart (the 409 of a ' +
         'save: a taken slug, a conflict to retry, or a record changed since its `version`). Match ' +
         'it instead of the message text',
      enum: ApiErrorCode,
      enumName: 'ApiErrorCode',
      required: false,
      example: ApiErrorCode.SLUG_TAKEN,
   })
   code?: ApiErrorCode;

   @ApiProperty({
      description: 'The stored `version` of the record, sent with the code VERSION_CONFLICT',
      required: false,
      type: 'integer',
      example: 3,
   })
   currentVersion?: number;
}
