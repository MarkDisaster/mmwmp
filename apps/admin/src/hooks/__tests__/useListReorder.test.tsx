import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useListReorder } from '../useListReorder';

const move = { mutate: vi.fn(), isPending: false };

const setup = (options: Partial<Parameters<typeof useListReorder>[0]> = {}) =>
   renderHook(() =>
      useListReorder({
         itemCount: 3,
         sorting: undefined,
         isPlaceholderData: false,
         move,
         ...options,
      }),
   ).result.current;

describe('useListReorder', () => {
   it('should be active in the saved order with more than one item', () => {
      const { canReorder, reorder } = setup();
      expect(canReorder).toBe(true);
      expect(reorder?.disabled).toBe(false);
   });

   it('should be inactive when sorted by another column or in reverse saved order', () => {
      expect(setup({ sorting: { id: 'createdAt', desc: false } }).reorder?.disabled).toBe(true);
      expect(setup({ sorting: { id: 'sortOrder', desc: true } }).canReorder).toBe(false);
      expect(setup({ sorting: { id: 'sortOrder', desc: false } }).canReorder).toBe(true);
   });

   it('should be inactive with one item, while loading the next page or while a move is saved', () => {
      expect(setup({ itemCount: 1 }).canReorder).toBe(false);
      expect(setup({ isPlaceholderData: true }).reorder?.disabled).toBe(true);
      expect(setup({ move: { ...move, isPending: true } }).reorder?.disabled).toBe(true);
   });

   it('should return no reorder for a role that may not move', () => {
      expect(setup({ canMove: false }).reorder).toBeUndefined();
   });

   it('should send the move with numeric IDs', () => {
      setup().reorder?.onReorder({ id: '1', targetId: '3', position: 'after' });
      expect(move.mutate).toHaveBeenCalledWith({ id: 1, data: { targetId: 3, position: 'after' } });
   });
});
