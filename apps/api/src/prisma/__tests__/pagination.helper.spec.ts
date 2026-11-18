import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

import { buildOrderBy } from '../pagination.helper';

const query = (overrides: Partial<PaginationQueryDto> = {}): PaginationQueryDto =>
   ({ page: 0, sortOrder: 'asc', ...overrides }) as PaginationQueryDto;

const fields = { sortOrder: 'sortOrder', createdAt: 'createdAt' };

describe('buildOrderBy', () => {
   it('sorts by the default field and ends with id, so ties have a fixed order', () => {
      expect(buildOrderBy(query(), fields, 'sortOrder')).toEqual([
         { sortOrder: 'asc' },
         { id: 'asc' },
      ]);
   });

   it('sorts by the requested field when it is allowed', () => {
      expect(buildOrderBy(query({ sortBy: 'createdAt' }), fields, 'sortOrder')).toEqual([
         { createdAt: 'asc' },
         { id: 'asc' },
      ]);
   });

   it('ignores a field that is not allowed and falls back to the default', () => {
      expect(buildOrderBy(query({ sortBy: 'password' }), fields, 'sortOrder')).toEqual([
         { sortOrder: 'asc' },
         { id: 'asc' },
      ]);
   });

   it('breaks ties in the same direction as the list', () => {
      expect(buildOrderBy(query({ sortOrder: 'desc' }), fields, 'sortOrder')).toEqual([
         { sortOrder: 'desc' },
         { id: 'desc' },
      ]);
   });

   it('uses the default order when the query has none', () => {
      const noOrder = { page: 0 } as PaginationQueryDto;

      expect(buildOrderBy(noOrder, fields, 'createdAt', 'desc')).toEqual([
         { createdAt: 'desc' },
         { id: 'desc' },
      ]);
   });

   it('keeps every term of a mapping that returns several and appends id once', () => {
      const mapped = {
         name: (order: 'asc' | 'desc') => [{ lastName: order }, { firstName: order }],
      };

      expect(buildOrderBy(query({ sortBy: 'name' }), mapped, 'name')).toEqual([
         { lastName: 'asc' },
         { firstName: 'asc' },
         { id: 'asc' },
      ]);
   });

   it('still appends the root id when only a related id is sorted (it is not unique in the list)', () => {
      const mapped = { author: (order: 'asc' | 'desc') => ({ createdBy: { id: order } }) };

      expect(buildOrderBy(query({ sortBy: 'author' }), mapped, 'author')).toEqual([
         { createdBy: { id: 'asc' } },
         { id: 'asc' },
      ]);
   });

   it('does not add id a second time when the mapping already sorts by it', () => {
      const mapped = { id: (order: 'asc' | 'desc') => ({ id: order }) };

      expect(buildOrderBy(query({ sortBy: 'id' }), mapped, 'id')).toEqual([{ id: 'asc' }]);
   });
});

describe('buildOrderBy — inherited keys', () => {
   it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
      'falls back to the default field for the prototype key "%s"',
      (sortBy) => {
         expect(buildOrderBy(query({ sortBy }), fields, 'sortOrder')).toEqual([
            { sortOrder: 'asc' },
            { id: 'asc' },
         ]);
      },
   );
});
