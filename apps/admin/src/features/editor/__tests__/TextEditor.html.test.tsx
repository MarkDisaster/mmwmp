import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';

import { TextEditor } from '../components/TextEditor';

vi.mock('@/features/files/hooks/useUploadFile', () => ({
   useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));

Range.prototype.getClientRects ??= () =>
   Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => ({
   x: 0,
   y: 0,
   width: 0,
   height: 0,
   top: 0,
   right: 0,
   bottom: 0,
   left: 0,
   toJSON: () => ({}),
});

describe('TextEditor HTML window', () => {
   it('should open a window with the current HTML of the article from the toolbar', async () => {
      render(<TextEditor content="<p>Hello</p><ul><li>b</li></ul>" onChange={vi.fn()} />, {
         wrapper: QueryWrapper,
      });
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'HTML source' }));

      expect(screen.getByRole('dialog', { name: 'HTML source' })).toBeInTheDocument();
      const text = document.querySelector('pre')?.textContent ?? '';
      expect(text).toContain('<p>Hello</p>');
      expect(text).toContain('<ul>\n   <li>');

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
   });
});
