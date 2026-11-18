import type { ToolContext } from '@/ai/tools/tool-auth';
import { Language } from '@/generated/prisma/enums';

import type { ContactService } from '../../contact.service';
import { GetContactTool } from '../get-contact.tool';

describe('GetContactTool', () => {
   it('should return the heading and description per language', async () => {
      const find = jest.fn().mockResolvedValue({
         companyName: 'Marek',
         translations: [
            {
               id: 1,
               contactId: 1,
               language: Language.cs,
               description: '<p>A</p>',
               aboutTitle: 'Kdo',
            },
            { id: 2, contactId: 1, language: Language.en, description: null, aboutTitle: null },
         ],
      });
      const tool = new GetContactTool({ find } as unknown as ContactService);

      const result = await tool.execute({} as ToolContext, {});

      expect(result?.translations).toEqual([
         { language: Language.cs, aboutTitle: 'Kdo', description: '<p>A</p>' },
         { language: Language.en, aboutTitle: null, description: null },
      ]);
   });

   it('should return null when no contact exists', async () => {
      const tool = new GetContactTool({
         find: jest.fn().mockResolvedValue(null),
      } as unknown as ContactService);

      expect(await tool.execute({} as ToolContext, {})).toBeNull();
   });
});
