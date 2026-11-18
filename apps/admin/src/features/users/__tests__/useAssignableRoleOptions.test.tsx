import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { api } from '@/api';
import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { useAssignableRoleOptions } from '../hooks/useAssignableRoleOptions';

const PROJECTS_READ = 'projects.read';
const EDITOR = createRole(['users.create', PROJECTS_READ, 'projects.update'], { id: 2 });
const READER = createRole([PROJECTS_READ], { id: 3, name: 'reader' });
const PUBLISHER = createRole([PROJECTS_READ, 'projects.publish'], { id: 4, name: 'publisher' });

const renderOptions = () => {
   queryClient.setQueryData(api.roles.queries.all().queryKey, {
      data: [ADMIN_ROLE, EDITOR, READER, PUBLISHER],
      totalCount: 4,
   });
   return renderHook(useAssignableRoleOptions, { wrapper: QueryWrapper }).result.current;
};

afterEach(() => {
   queryClient.clear();
});

describe('useAssignableRoleOptions', () => {
   it('should offer only the roles within the permissions of the signed-in user', () => {
      signInAs(createUser(EDITOR));

      expect(renderOptions()).toEqual([
         { value: '2', label: 'editor' },
         { value: '3', label: 'reader' },
      ]);
   });

   it('should offer every role except the admin role to an admin', () => {
      signInAs(createUser(ADMIN_ROLE));

      expect(renderOptions().map((option) => option.label)).toEqual([
         'editor',
         'reader',
         'publisher',
      ]);
   });

   it('should offer nothing until the signed-in user is known', () => {
      expect(renderOptions()).toEqual([]);
   });
});
