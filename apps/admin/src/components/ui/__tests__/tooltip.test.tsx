import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { InfoHint } from '@/components/common/InfoHint';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const renderTooltip = () =>
   render(
      <TooltipProvider delayDuration={0}>
         <Tooltip>
            <TooltipTrigger asChild>
               <button type="button" aria-label="Edit">
                  E
               </button>
            </TooltipTrigger>
            <TooltipContent>Edit the row</TooltipContent>
         </Tooltip>
      </TooltipProvider>,
   );

describe('Tooltip', () => {
   it('should open on keyboard focus with role tooltip, described by the content', async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.tab();

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent('Edit the row');
      expect(screen.getByRole('button', { name: 'Edit' })).toHaveAttribute('aria-describedby');
   });

   it('should open on hover and close on Escape', async () => {
      const user = userEvent.setup();
      renderTooltip();
      const button = screen.getByRole('button', { name: 'Edit' });

      await user.hover(button);
      expect(await screen.findByRole('tooltip')).toBeInTheDocument();

      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
   });

   it('should render an arrow and open above the element by default', async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.tab();

      await screen.findByRole('tooltip');
      const content = document.querySelector('[data-slot], [data-side]');
      expect(content).toHaveAttribute('data-side', 'top');
      expect(document.querySelector('[data-side="top"] svg')).toBeInTheDocument();
   });
});

describe('InfoHint', () => {
   const hoverIcon = () => screen.getByRole('img', { name: 'Help' });

   it('should open above the icon by default with the same arrow', async () => {
      const user = userEvent.setup();
      render(<InfoHint label="Help">Some help</InfoHint>);

      await user.hover(hoverIcon());

      expect(await screen.findByRole('tooltip')).toHaveTextContent('Some help');
      expect(document.querySelector('[data-side="top"]')).toBeInTheDocument();
      expect(document.querySelector('[data-side="top"] svg')).toBeInTheDocument();
   });

   it('should close on Escape and leave the icon unfocused by the close', async () => {
      const user = userEvent.setup();
      render(<InfoHint label="Help">Some help</InfoHint>);

      await user.hover(hoverIcon());
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Some help');
      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
      expect(hoverIcon()).not.toHaveFocus();
   });

   it('should open on keyboard focus and close on blur', async () => {
      const user = userEvent.setup();
      render(<InfoHint label="Help">Some help</InfoHint>);

      await user.tab();
      expect(hoverIcon()).toHaveFocus();
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Some help');

      await user.tab();
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
   });

   it('should keep the hint open while the pointer is over it, and not open the row around it', async () => {
      const user = userEvent.setup();
      const onRowClick = vi.fn();
      render(
         <table>
            <tbody>
               <tr onClick={onRowClick}>
                  <td>
                     <InfoHint label="Help">Some help</InfoHint>
                  </td>
               </tr>
            </tbody>
         </table>,
      );

      await user.hover(hoverIcon());
      const hint = await screen.findByRole('tooltip');
      await user.click(hint);

      expect(onRowClick).not.toHaveBeenCalled();
   });

   it('should open on a tap and close on a tap outside', async () => {
      render(<InfoHint label="Help">Some help</InfoHint>);
      const icon = hoverIcon();

      fireEvent.pointerDown(icon, { pointerType: 'touch' });
      fireEvent.click(icon);
      expect(await screen.findByRole('tooltip')).toHaveTextContent('Some help');

      fireEvent.pointerDown(document.body, { pointerType: 'touch' });
      fireEvent.click(document.body);
      await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
   });
});
