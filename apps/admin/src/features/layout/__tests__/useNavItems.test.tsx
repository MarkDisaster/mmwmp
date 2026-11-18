import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { signInAs } from '@/test/auth';
import { ADMIN_ROLE, createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { useNavItems } from '../hooks/useNavItems';

const renderNavLabels = () =>
   renderHook(useNavItems, { wrapper: QueryWrapper }).result.current.map((item) => item.label);

afterEach(() => {
   queryClient.clear();
});

describe('useNavItems', () => {
   it('should list only the pages the role may read', () => {
      signInAs(createUser(createRole(['projects.read', 'projects.update', 'audit_logs.read'])));

      expect(renderNavLabels()).toEqual(['Dashboard', 'Projects', 'Audit log']);
   });

   it('should list every page for the admin role', () => {
      signInAs(createUser(ADMIN_ROLE));

      expect(renderNavLabels()).toHaveLength(11);
   });

   it('should list the trash with the delete permission of any of its content', () => {
      signInAs(createUser(createRole(['tags.read', 'tags.delete'])));

      expect(renderNavLabels()).toEqual(['Dashboard', 'Tags', 'Trash']);
   });

   it('should not list the trash for a role that may only read and edit', () => {
      signInAs(createUser(createRole(['projects.read', 'projects.update'])));

      expect(renderNavLabels()).not.toContain('Trash');
   });

   it('should list only the dashboard until the user is loaded', () => {
      expect(renderNavLabels()).toEqual(['Dashboard']);
   });
});
