import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { NewerVersionNotice } from '../NewerVersionNotice';

describe('NewerVersionNotice', () => {
   it('should keep the live region mounted and announce the note when it appears', () => {
      const { container, rerender } = render(
         <NewerVersionNotice visible={false} onReload={vi.fn()} />,
      );
      const region = container.querySelector('[aria-live="polite"]');
      if (!region) throw new Error('The live region is not mounted');
      expect(region).toBeEmptyDOMElement();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      rerender(<NewerVersionNotice visible onReload={vi.fn()} />);

      expect(container.querySelector('[aria-live="polite"]')).toBe(region);
      expect(region).toHaveTextContent('This record changed outside the form');
   });

   it('should reload on click and disable the button while it loads', async () => {
      const onReload = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<NewerVersionNotice visible onReload={onReload} />);

      await user.click(screen.getByRole('button', { name: 'Load current version' }));
      expect(onReload).toHaveBeenCalledTimes(1);

      rerender(<NewerVersionNotice visible onReload={onReload} isReloading />);
      expect(screen.getByRole('button', { name: 'Load current version' })).toBeDisabled();
   });
});
