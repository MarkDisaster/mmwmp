import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { EditorFormLayout } from '../EditorFormLayout';

const Layout = ({ disabled }: { disabled: boolean }) => (
   <>
      <EditorFormLayout
         formId="form"
         onSubmit={(event) => event.preventDefault()}
         header={<h1>Editor</h1>}
         disabled={disabled}
      >
         <label>
            Title
            <input />
         </label>
      </EditorFormLayout>
      <button type="button">Outside</button>
   </>
);

describe('EditorFormLayout', () => {
   it('should lock the inputs while disabled', () => {
      render(<Layout disabled />);

      expect(screen.getByRole('textbox', { name: 'Title' })).toBeDisabled();
   });

   it('should give the focus back to the input focused last when the lock ends', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Layout disabled={false} />);
      const input = screen.getByRole('textbox', { name: 'Title' });
      await user.click(input);

      input.blur();
      rerender(<Layout disabled />);
      expect(document.body).toHaveFocus();

      rerender(<Layout disabled={false} />);
      expect(input).toHaveFocus();
   });

   it('should not take the focus from an element the user focused during the lock', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<Layout disabled={false} />);
      await user.click(screen.getByRole('textbox', { name: 'Title' }));

      rerender(<Layout disabled />);
      const outside = screen.getByRole('button', { name: 'Outside' });
      outside.focus();

      rerender(<Layout disabled={false} />);
      expect(outside).toHaveFocus();
   });
});
