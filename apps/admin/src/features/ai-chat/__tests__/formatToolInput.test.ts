import { describe, expect, it } from 'vitest';

import { formatToolInput } from '../utils/formatToolInput';

describe('formatToolInput', () => {
   it('should return null without an input', () => {
      expect(formatToolInput(null)).toBeNull();
      expect(formatToolInput(undefined)).toBeNull();
   });

   it('should write a single flat value alone', () => {
      expect(formatToolInput({ id: 4 })).toBe('4');
      expect(formatToolInput({ key: 'foo' })).toBe('foo');
   });

   it('should write primitives as they are', () => {
      expect(formatToolInput('hello')).toBe('hello');
      expect(formatToolInput(7)).toBe('7');
   });

   it('should name the fields and write nested values as JSON', () => {
      const label = formatToolInput({
         roleId: 3,
         permissions: [
            { resource: 'projects', action: 'update' },
            { resource: 'users', action: 'delete' },
         ],
      });
      expect(label).toBe(
         'roleId: 3; permissions: [{"resource":"projects","action":"update"},{"resource":"users","action":"delete"}]',
      );
      expect(label).not.toContain('[object Object]');
   });

   it('should not shorten long nested values', () => {
      const text = 'x'.repeat(500);
      expect(formatToolInput({ id: 1, body: { text } })).toContain(text);
   });

   it('should write an array input as JSON', () => {
      expect(formatToolInput([1, { a: 2 }])).toBe('[1,{"a":2}]');
   });

   it('should name every key when there are two or more', () => {
      expect(formatToolInput({ id: 3, active: false })).toBe('id: 3; active: false');
      expect(formatToolInput({ id: 7, force: true })).toBe('id: 7; force: true');
   });
});
