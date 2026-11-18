import { AiTool } from '@/ai/tools/ai-tool.decorator';
import type { ToolContext } from '@/ai/tools/tool-auth';
import { RICH_TEXT_HTML_HINT } from '@/common/sanitize/sanitize-rich-text';
import { Language } from '@/generated/prisma/enums';

import { MAX_ABOUT_TITLE_LENGTH } from '../../contact.constants';
import type { ContactService } from '../../contact.service';
import { UpdateContactTool } from '../update-contact.tool';

describe('UpdateContactTool about heading', () => {
   const schema = Reflect.getMetadata(AiTool.KEY, UpdateContactTool).inputSchema;
   const upsert = jest.fn().mockResolvedValue({ translations: [] });
   const tool = new UpdateContactTool({ upsert } as unknown as ContactService);

   beforeEach(() => upsert.mockClear());

   it.each(['aboutTitleCs', 'aboutTitleEn'])('should trim %s and reject a longer one', (field) => {
      expect(schema.safeParse({ [field]: '  Kdo jsem ' }).data[field]).toBe('Kdo jsem');
      expect(schema.safeParse({ [field]: null }).success).toBe(true);
      expect(schema.safeParse({ [field]: 'a'.repeat(MAX_ABOUT_TITLE_LENGTH + 1) }).success).toBe(
         false,
      );
   });

   it('should send only the heading, so the description stays', async () => {
      await tool.execute({} as ToolContext, { aboutTitleCs: 'Kdo jsem' });

      expect(upsert).toHaveBeenCalledWith({
         translations: [{ language: Language.cs, aboutTitle: 'Kdo jsem' }],
      });
   });

   it('should send both fields of a language and clear with null', async () => {
      await tool.execute({} as ToolContext, { descriptionEn: 'Text', aboutTitleEn: null });

      expect(upsert).toHaveBeenCalledWith({
         translations: [{ language: Language.en, description: 'Text', aboutTitle: null }],
      });
   });

   it('should send no translations when none of the fields is passed', async () => {
      await tool.execute({} as ToolContext, { phone: '1' });

      expect(upsert).toHaveBeenCalledWith({ phone: '1' });
   });
});

describe('UpdateContactTool input schema', () => {
   const schema = Reflect.getMetadata(AiTool.KEY, UpdateContactTool).inputSchema;

   it.each(['descriptionCs', 'descriptionEn'])('should give %s the rich text hint', (field) => {
      expect(schema.shape[field].description).toContain(RICH_TEXT_HTML_HINT);
   });

   it.each(['aboutTitleCs', 'aboutTitleEn'])(
      'should not give the plain text %s the hint',
      (field) => {
         expect(schema.shape[field].description).not.toContain('Allowed HTML tags');
      },
   );

   describe.each(['linkedinUrl', 'githubUrl'])('%s', (field) => {
      const parse = (value: string | null) => schema.safeParse({ [field]: value });

      it.each(['javascript:alert(1)', 'data:text/html,x', 'example.com', 'ftp://example.com'])(
         'should reject %s',
         (value) => {
            expect(parse(value).success).toBe(false);
         },
      );

      it('should accept an absolute http(s) URL, trimmed', () => {
         const result = parse(' https://github.com/marek ');

         expect(result.success).toBe(true);
         expect(result.data[field]).toBe('https://github.com/marek');
      });

      it('should accept null to clear the URL', () => {
         expect(parse(null).success).toBe(true);
      });
   });
});
