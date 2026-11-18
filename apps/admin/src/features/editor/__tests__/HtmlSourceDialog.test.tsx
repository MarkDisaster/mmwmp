import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HtmlSourceDialog } from '../components/HtmlSourceDialog';

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('sonner', () => ({ toast }));

const HTML = '<p>a</p><ul><li>b</li></ul>';

const renderDialog = (onClose = vi.fn(), open = true) => {
   render(<HtmlSourceDialog open={open} html={HTML} onClose={onClose} />);
   return { onClose, user: userEvent.setup() };
};

const stubClipboard = (writeText: (text: string) => Promise<void>) => {
   vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
};

describe('HtmlSourceDialog', () => {
   afterEach(() => {
      vi.unstubAllGlobals();
      vi.clearAllMocks();
   });

   it('should show the formatted HTML in a pre element under the title', () => {
      renderDialog();

      expect(screen.getByRole('dialog', { name: 'HTML source' })).toBeInTheDocument();
      const pre = document.querySelector('pre');
      expect(pre?.textContent).toBe('<p>a</p>\n<ul>\n   <li>b</li>\n</ul>');
   });

   it('should render nothing when closed', () => {
      renderDialog(vi.fn(), false);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
   });

   it('should copy the unformatted HTML and confirm it', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      const { user } = renderDialog();
      stubClipboard(writeText);

      await user.click(screen.getByRole('button', { name: 'Copy' }));

      expect(writeText).toHaveBeenCalledWith(HTML);
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Copied'));
   });

   it('should show an error toast when the copy is rejected', async () => {
      const { user } = renderDialog();
      stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));

      await user.click(screen.getByRole('button', { name: 'Copy' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
   });

   it('should close on Escape', async () => {
      const { onClose, user } = renderDialog();

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalled();
   });
});
