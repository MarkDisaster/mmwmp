import type { MutationOptions, QueryOptions } from '@tanstack/react-query';

export type ApiDefinitionObject = {
   queries?: Record<
      string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | QueryOptions<any, any, any, any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((...args: any[]) => QueryOptions<any, any, any, any>)
   >;
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   mutations?: Record<string, MutationOptions<any, any, any, any>>;
};

export type QueryKeysObject = Record<
   string,
   // eslint-disable-next-line @typescript-eslint/no-explicit-any
   readonly unknown[] | ((...args: any[]) => readonly unknown[])
>;

export type MutationKeysObject = Record<string, readonly unknown[]>;
