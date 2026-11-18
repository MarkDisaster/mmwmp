import type { PaginationQueryDto } from '@/common/dto/pagination-query.dto';

export const buildPaginationArgs = (query: PaginationQueryDto) => ({
   skip: query.limit ? query.page * query.limit : 0,
   take: query.limit ?? 99999,
});

export type OrderByMap = Record<string, string | ((order: 'asc' | 'desc') => object | object[])>;

const withIdTiebreaker = (orderBy: object | object[], order: 'asc' | 'desc'): object[] => {
   const terms = Array.isArray(orderBy) ? orderBy : [orderBy];
   return terms.some((term) => 'id' in term) ? terms : [...terms, { id: order }];
};

export const buildOrderBy = (
   query: PaginationQueryDto,
   allowedFields: OrderByMap,
   defaultField: string,
   defaultOrder: 'asc' | 'desc' = 'asc',
) => {
   const field =
      query.sortBy && Object.hasOwn(allowedFields, query.sortBy) ? query.sortBy : defaultField;
   const order = query.sortOrder ?? defaultOrder;
   const mapping = allowedFields[field];
   const primary = typeof mapping === 'function' ? mapping(order) : { [mapping]: order };
   return withIdTiebreaker(primary, order);
};

export const buildSearchWhere = (search: string | undefined, fields: string[]) => {
   if (!search?.trim()) return {};
   const term = search.trim();
   return {
      OR: fields.map((field) => ({
         [field]: { contains: term, mode: 'insensitive' as const },
      })),
   };
};
