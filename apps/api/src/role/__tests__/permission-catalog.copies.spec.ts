import { readFileSync } from 'fs';
import { join } from 'path';

import { PERMISSION_CATALOG } from '../permission-catalog';

const ADMIN_COPY = join(__dirname, '../../../../admin/src/features/roles/constants.ts');

const readAdminCopy = (): Record<string, string[]> => {
   const source = readFileSync(ADMIN_COPY, 'utf8');
   const body = /RESOURCE_ACTIONS = \{([\s\S]*?)\} as const/.exec(source)?.[1];
   if (body === undefined) throw new Error(`No RESOURCE_ACTIONS in ${ADMIN_COPY}`);

   return Object.fromEntries(
      [...body.matchAll(/(\w+): \[([^\]]*)\]/g)].map(([, resource, actions]) => [
         resource,
         [...actions.matchAll(/'(\w+)'/g)].map(([, action]) => action).sort(),
      ]),
   );
};

describe('permission catalog copies', () => {
   it('should offer the same permissions in the admin as the API catalog', () => {
      const catalog = Object.fromEntries(
         Object.entries(PERMISSION_CATALOG).map(([resource, actions]) => [
            resource,
            [...actions].sort(),
         ]),
      );

      expect(readAdminCopy()).toEqual(catalog);
   });
});
