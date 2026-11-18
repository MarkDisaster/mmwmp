import { readFileSync } from 'fs';
import { join } from 'path';

import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { buildOrderBy } from '@/prisma/pagination.helper';

import { SERVICE_ORDER_BY } from '../service.service';

const ADMIN_SORT_FIELDS = join(__dirname, '../../../../admin/src/features/services/constants.ts');

const adminSortFields = (): string[] => {
   const source = readFileSync(ADMIN_SORT_FIELDS, 'utf8');
   const list = /export const SERVICE_SORT_FIELDS = \[([^\]]*)\]/.exec(source)?.[1];
   if (list === undefined) throw new Error(`No SERVICE_SORT_FIELDS in ${ADMIN_SORT_FIELDS}`);
   return [...list.matchAll(/'([^']+)'/g)].map(([, field]) => field);
};

const query = (sortBy: string) => ({ page: 0, sortBy, sortOrder: 'desc' }) as PaginationQueryDto;

describe('SERVICE_SORT_FIELDS of the admin', () => {
   it('reads the sortable columns of the admin', () => {
      expect(adminSortFields()).toContain('sortOrder');
   });

   it.each(adminSortFields())('sorts the service list by %s', (field) => {
      expect(Object.keys(SERVICE_ORDER_BY)).toContain(field);
   });

   it.each(adminSortFields().filter((field) => field !== 'sortOrder'))(
      'does not fall back to the manual order for %s',
      (field) => {
         expect(buildOrderBy(query(field), SERVICE_ORDER_BY, 'sortOrder')).not.toEqual(
            buildOrderBy(query('unknown'), SERVICE_ORDER_BY, 'sortOrder'),
         );
      },
   );
});

describe('SERVICE_ORDER_BY', () => {
   it('sorts by the author as GET /projects does (createdBy, last and first name)', () => {
      expect(buildOrderBy(query('createdBy'), SERVICE_ORDER_BY, 'sortOrder')).toEqual([
         { createdBy: { lastName: 'desc' } },
         { createdBy: { firstName: 'desc' } },
         { id: 'desc' },
      ]);
   });
});
