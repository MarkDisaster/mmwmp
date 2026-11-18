import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataTableReorder } from '@/utils/reorder';

import { SortableCard, SortableCardGrid } from '../SortableCardGrid';

const HANDLE = 'Drag to reorder';
const IDS = ['1', '2', '3'];

beforeEach(() => {
   vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
   ) {
      const card = this.matches('[data-card]') ? this : this.querySelector('[data-card]');
      const left = Math.max(IDS.indexOf(card?.getAttribute('data-card') ?? ''), 0) * 100;
      return {
         x: left,
         y: 0,
         left,
         top: 0,
         right: left + 100,
         bottom: 100,
         width: 100,
         height: 100,
      } as DOMRect;
   });
});

afterEach(() => {
   vi.restoreAllMocks();
});

const renderGrid = (reorder: Partial<DataTableReorder> = {}) => {
   const onReorder = vi.fn();
   render(
      <SortableCardGrid ids={IDS} reorder={{ onReorder, ...reorder }}>
         {IDS.map((id) => (
            <SortableCard key={id} id={id} disabled={reorder.isRowDisabled?.(id)}>
               <div data-card={id}>Card {id}</div>
            </SortableCard>
         ))}
      </SortableCardGrid>,
   );
   return onReorder;
};

const moveWithKeyboard = async (handleIndex: number, arrow: string) => {
   const user = userEvent.setup();
   screen.getAllByRole('button', { name: HANDLE })[handleIndex].focus();
   await user.keyboard(' ');
   await user.keyboard(arrow);
   await user.keyboard(' ');
};

describe('SortableCardGrid', () => {
   it('should render a focusable handle with an accessible name on every card', () => {
      renderGrid();
      const handles = screen.getAllByRole('button', { name: HANDLE });
      expect(handles).toHaveLength(3);
      handles.forEach((handle) => expect(handle).toHaveAttribute('aria-disabled', 'false'));
   });

   it('should move a card with the keyboard and report the target and position', async () => {
      const onReorder = renderGrid();

      await moveWithKeyboard(0, '{ArrowRight}');

      expect(onReorder).toHaveBeenCalledTimes(1);
      expect(onReorder).toHaveBeenCalledWith({ id: '1', targetId: '2', position: 'after' });
   });

   it('should report a move back as before the target', async () => {
      const onReorder = renderGrid();

      await moveWithKeyboard(2, '{ArrowLeft}');

      expect(onReorder).toHaveBeenCalledWith({ id: '3', targetId: '2', position: 'before' });
   });

   it('should keep the handle of a locked card inert', async () => {
      const onReorder = renderGrid({ isRowDisabled: (id) => id === '1' });
      expect(screen.getAllByRole('button', { name: HANDLE })[0]).toHaveAttribute(
         'aria-disabled',
         'true',
      );

      await moveWithKeyboard(0, '{ArrowRight}');

      expect(onReorder).not.toHaveBeenCalled();
   });

   it('should not move anything while the grid is disabled', async () => {
      const onReorder = renderGrid({ disabled: true });

      await moveWithKeyboard(1, '{ArrowLeft}');

      expect(onReorder).not.toHaveBeenCalled();
   });
});
