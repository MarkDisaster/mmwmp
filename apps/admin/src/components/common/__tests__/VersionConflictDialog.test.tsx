import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VersionConflictDialog } from '../VersionConflictDialog';

describe('VersionConflictDialog', () => {
   it('should offer to load the current version or to close, and nothing that overwrites', async () => {
      const onReload = vi.fn();
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      render(<VersionConflictDialog open onOpenChange={onOpenChange} onReload={onReload} />);

      expect(
         screen.getByRole('alertdialog', {
            name: 'This record changed in the meantime',
         }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /overwrite|save anyway/i })).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Load current version' }));
      expect(onReload).toHaveBeenCalledTimes(1);

      await user.click(screen.getAllByRole('button', { name: 'Close' })[0]);
      expect(onOpenChange).toHaveBeenCalledWith(false);
   });
});
