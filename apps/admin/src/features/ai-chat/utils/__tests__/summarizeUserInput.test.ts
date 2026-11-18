import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { findCachedUser, type KnownUser, summarizeUserInput } from '../summarizeUserInput';

const EMAIL = 'jana@example.com';
const JANA: KnownUser = { id: 7, email: EMAIL, firstName: 'Jana', lastName: 'Nováková' };
const known = (user: KnownUser) => (id: number) => (id === user.id ? user : undefined);
const unknown = () => undefined;

describe('summarizeUserInput', () => {
   it('should name the user deactivateUser deactivates by name and e-mail', () => {
      expect(summarizeUserInput('deactivateUser', { id: 7 }, known(JANA))).toEqual({
         key: 'chat.approval.userLabel',
         params: { name: 'Jana Nováková', email: EMAIL, id: 7 },
      });
   });

   it('should name a user without a name by the e-mail', () => {
      const user = { id: 7, email: EMAIL, firstName: '', lastName: '' };
      expect(summarizeUserInput('deactivateUser', { id: 7 }, known(user))).toEqual({
         key: 'chat.approval.userEmail',
         params: { email: EMAIL, id: 7 },
      });
   });

   it('should fall back to the id when the admin has not loaded the user', () => {
      expect(summarizeUserInput('deactivateUser', { id: 7 }, unknown)).toEqual({
         key: 'chat.approval.userTarget',
         params: { id: 7 },
      });
   });

   it('should leave other tools and inputs without a numeric id to the generic line', () => {
      expect(summarizeUserInput('deleteTag', { id: 7 }, known(JANA))).toBeNull();
      expect(summarizeUserInput('deactivateUser', { id: '7' }, known(JANA))).toBeNull();
      expect(summarizeUserInput('deactivateUser', null, known(JANA))).toBeNull();
   });
});

describe('findCachedUser', () => {
   it('should find the user in a cached page of the list, the detail or the signed-in user', () => {
      const list = new QueryClient();
      list.setQueryData(['users', 'list', { page: 1 }], { data: [JANA], totalCount: 1 });
      expect(findCachedUser(list, 7)).toEqual(JANA);

      const detail = new QueryClient();
      detail.setQueryData(['users', 'detail', 7], JANA);
      expect(findCachedUser(detail, 7)).toEqual(JANA);

      const me = new QueryClient();
      me.setQueryData(['users', 'me'], JANA);
      expect(findCachedUser(me, 7)).toEqual(JANA);
   });

   it('should return undefined for a user no users query holds', () => {
      const client = new QueryClient();
      client.setQueryData(['users', 'list', { page: 1 }], { data: [JANA], totalCount: 1 });
      client.setQueryData(['roles', 'detail', 8], {
         id: 8,
         name: 'editor',
         email: 'x@example.com',
      });
      expect(findCachedUser(client, 8)).toBeUndefined();
      expect(findCachedUser(new QueryClient(), 7)).toBeUndefined();
   });
});
