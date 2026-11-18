import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRecordVersion } from '../useRecordVersion';

type Props = { record?: { id: number; version: number }; isDirty: boolean };

const renderVersion = (initialProps: Props) =>
   renderHook(({ record, isDirty }: Props) => useRecordVersion(record, isDirty), {
      initialProps,
   });

describe('useRecordVersion', () => {
   it('should follow a record that changes while the form is clean', () => {
      const { result, rerender } = renderVersion({ record: { id: 1, version: 1 }, isDirty: false });

      rerender({ record: { id: 1, version: 2 }, isDirty: false });

      expect(result.current.version).toBe(2);
      expect(result.current.hasNewer).toBe(false);
   });

   it('should keep the version the form was filled from while it holds unsaved input', () => {
      const { result, rerender } = renderVersion({ record: { id: 1, version: 1 }, isDirty: true });

      rerender({ record: { id: 1, version: 2 }, isDirty: true });

      expect(result.current.version).toBe(1);
      expect(result.current.hasNewer).toBe(true);
   });

   it('should take the newest version once the form is clean again', () => {
      const { result, rerender } = renderVersion({ record: { id: 1, version: 1 }, isDirty: true });
      rerender({ record: { id: 1, version: 2 }, isDirty: true });

      rerender({ record: { id: 1, version: 2 }, isDirty: false });

      expect(result.current.version).toBe(2);
      expect(result.current.hasNewer).toBe(false);
   });

   it('should take the version of a record the form was reset to', () => {
      const { result } = renderVersion({ record: { id: 1, version: 1 }, isDirty: true });

      act(() => result.current.adopt({ id: 1, version: 5 }));

      expect(result.current.version).toBe(5);
   });

   it('should have no version for a record that is being created', () => {
      const { result } = renderVersion({ isDirty: true });

      expect(result.current.version).toBeUndefined();
      expect(result.current.hasNewer).toBe(false);
   });

   it('should not go back to an older version of the same record', () => {
      const { result, rerender } = renderVersion({ record: { id: 1, version: 3 }, isDirty: false });

      rerender({ record: { id: 1, version: 2 }, isDirty: false });

      expect(result.current.version).toBe(3);
   });

   it('should start over for another record', () => {
      const { result, rerender } = renderVersion({ record: { id: 1, version: 3 }, isDirty: false });

      rerender({ record: { id: 2, version: 1 }, isDirty: false });

      expect(result.current.version).toBe(1);
   });
});
