import { describe, expect, it } from 'vitest';

import { getAuthorLabel, getUserDisplayName, getUserInitials } from '../user';

const EMAIL = 'jan@test.cz';

describe('getUserDisplayName', () => {
   it('should use the full name and fall back to the e-mail', () => {
      expect(getUserDisplayName('Jan', 'Novák', EMAIL)).toEqual({
         fullName: 'Jan Novák',
         displayName: 'Jan Novák',
      });
      expect(getUserDisplayName(null, 'Novák', EMAIL).displayName).toBe('Novák');
      expect(getUserDisplayName(null, null, EMAIL)).toEqual({ fullName: '', displayName: EMAIL });
      expect(getUserDisplayName().displayName).toBe('');
   });
});

describe('getAuthorLabel', () => {
   it('should use the name, then a dash, never the e-mail', () => {
      const withEmail = (author: { firstName?: string; lastName?: string; email: string }) =>
         getAuthorLabel(author);

      expect(getAuthorLabel({ firstName: 'Jan', lastName: 'Novák' })).toBe('Jan Novák');
      expect(withEmail({ firstName: 'Jan', email: EMAIL })).toBe('Jan');
      expect(withEmail({ email: EMAIL })).toBe('—');
      expect(getAuthorLabel({})).toBe('—');
      expect(getAuthorLabel(null)).toBe('—');
      expect(getAuthorLabel(undefined)).toBe('—');
   });
});

describe('getUserInitials', () => {
   it('should take the first letters of the names in upper case', () => {
      expect(getUserInitials('jan', 'novák', EMAIL)).toBe('JN');
      expect(getUserInitials('Jan', null, EMAIL)).toBe('J');
      expect(getUserInitials(undefined, 'Novák')).toBe('N');
   });

   it('should fall back to the e-mail and then to a question mark', () => {
      expect(getUserInitials(null, null, EMAIL)).toBe('J');
      expect(getUserInitials('', '', '')).toBe('?');
      expect(getUserInitials()).toBe('?');
   });
});
