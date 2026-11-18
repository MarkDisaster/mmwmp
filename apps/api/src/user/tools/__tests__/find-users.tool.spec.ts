import { adminContext } from '@/ai/tools/__tests__/tool-context.fixture';

import type { UserService } from '../../user.service';
import { FindUsersTool } from '../find-users.tool';

describe('FindUsersTool', () => {
   it('finds a user by a name without diacritics, flags a deactivated account and links the filtered user list', async () => {
      const service = {
         findLookupCandidates: jest.fn().mockResolvedValue([
            {
               id: 5,
               email: 'jan.novak@example.com',
               firstName: 'Jan',
               lastName: 'Novák',
               deactivatedAt: new Date('2026-11-01T10:00:00Z'),
               role: { id: 2, name: 'Editor' },
            },
         ]),
      };
      const tool = new FindUsersTool(service as unknown as UserService);

      const result = await tool.execute(adminContext(), { query: 'novak jan' });

      expect(result.items).toEqual([
         {
            id: 5,
            name: 'Jan Novák',
            email: 'jan.novak@example.com',
            role: 'Editor',
            deactivated: true,
            adminUrl: '/users?search=jan.novak%40example.com',
            match: 'exact',
            matchedOn: 'name',
         },
      ]);
   });
});
