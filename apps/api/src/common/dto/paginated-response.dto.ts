import type { Type } from '@nestjs/common';
import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiProperty, getSchemaPath } from '@nestjs/swagger';

class PaginatedResponseDto<T> {
   @ApiProperty()
   data!: T[];

   @ApiProperty()
   totalCount!: number;
}

export const ApiPaginatedResponse = <TModel extends Type>(model: TModel) =>
   applyDecorators(
      ApiExtraModels(PaginatedResponseDto, model),
      ApiOkResponse({
         schema: {
            type: 'object',
            required: ['data', 'totalCount'],
            properties: {
               data: { type: 'array', items: { $ref: getSchemaPath(model) } },
               totalCount: { type: 'number' },
            },
         },
      }),
   );
