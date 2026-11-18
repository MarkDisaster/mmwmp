import { BadRequestException } from '@nestjs/common';

import { assertSameIds } from '../assert-same-ids';

const messages = {
   duplicates: 'duplicates',
   count: 'count',
   unknown: (id: number) => `unknown ${id}`,
};

describe('assertSameIds', () => {
   it('should accept the same IDs in another order', () => {
      expect(() => assertSameIds([3, 1, 2], [1, 2, 3], messages)).not.toThrow();
   });

   it('should accept two empty lists', () => {
      expect(() => assertSameIds([], [], messages)).not.toThrow();
   });

   it('should reject duplicate IDs', () => {
      expect(() => assertSameIds([1, 1], [1, 2], messages)).toThrow(
         new BadRequestException('duplicates'),
      );
   });

   it('should reject a list with a different number of IDs', () => {
      expect(() => assertSameIds([1], [1, 2], messages)).toThrow(new BadRequestException('count'));
      expect(() => assertSameIds([1, 2, 3], [1, 2], messages)).toThrow(
         new BadRequestException('count'),
      );
   });

   it('should reject an ID that does not exist', () => {
      expect(() => assertSameIds([1, 9], [1, 2], messages)).toThrow(
         new BadRequestException('unknown 9'),
      );
   });
});
