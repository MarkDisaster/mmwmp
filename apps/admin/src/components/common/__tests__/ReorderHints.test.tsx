import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ReorderHints } from '../ReorderHints';

vi.mock('@/components/common/InfoHint', () => ({
   InfoHint: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}));

describe('ReorderHints', () => {
   it('should render nothing while the list can be reordered or has a single row', () => {
      const { container, rerender } = render(<ReorderHints canReorder itemCount={5} />);
      expect(container).toBeEmptyDOMElement();

      rerender(<ReorderHints canReorder={false} itemCount={1} />);
      expect(container).toBeEmptyDOMElement();
   });

   it('should mention only the table for a list without a card view', () => {
      render(<ReorderHints canReorder={false} itemCount={5} />);

      expect(screen.getByText(/table|tabulce/i).textContent).not.toMatch(/card|karet/i);
   });

   it('should mention the card view for a list that has one', () => {
      render(<ReorderHints canReorder={false} itemCount={5} withCards />);

      expect(screen.getByText(/card|karet/i)).toBeInTheDocument();
   });
});
