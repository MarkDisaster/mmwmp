import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export const ExpectedVersion = () =>
   applyDecorators(
      ApiPropertyOptional({
         description:
            'The `version` of the record the change is based on (from its detail). When another ' +
            'one is stored, nothing is written and the answer is 409 with the code ' +
            'VERSION_CONFLICT. Left out, the change is written without the check',
         type: 'integer',
         minimum: 0,
      }),
      IsOptional(),
      IsInt(),
      Min(0),
   );
