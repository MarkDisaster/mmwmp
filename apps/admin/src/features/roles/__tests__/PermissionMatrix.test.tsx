import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PermissionMatrix } from '../components/PermissionMatrix';

describe('PermissionMatrix', () => {
   it('should disable the permissions the signed-in user may not grant', () => {
      render(
         <PermissionMatrix
            value={[{ resource: 'projects', action: 'read' }]}
            onChange={vi.fn()}
            canGrant={({ resource }) => resource === 'projects'}
         />,
      );

      expect(screen.getByRole('checkbox', { name: 'Projects: Read' })).toBeEnabled();
      expect(screen.getByRole('checkbox', { name: 'Projects: Publish' })).toBeEnabled();
      expect(screen.getByRole('checkbox', { name: 'Users: Read' })).toBeDisabled();
   });

   it('should offer the roles and the audit log permissions the API checks', () => {
      render(<PermissionMatrix value={[]} onChange={vi.fn()} />);

      expect(screen.getByRole('checkbox', { name: 'Roles: Update' })).toBeEnabled();
      expect(screen.getByRole('checkbox', { name: 'Audit log: Read' })).toBeEnabled();
      expect(screen.queryByRole('checkbox', { name: 'Audit log: Update' })).not.toBeInTheDocument();
   });

   it('should show a resource name as translated, not capitalised word by word', () => {
      render(<PermissionMatrix value={[]} onChange={vi.fn()} />);

      expect(screen.getByText('Game scores')).not.toHaveClass('capitalize');
      expect(screen.getByText('Audit log')).not.toHaveClass('capitalize');
      expect(screen.getByRole('columnheader', { name: 'Publish' })).not.toHaveClass('capitalize');
   });
});
