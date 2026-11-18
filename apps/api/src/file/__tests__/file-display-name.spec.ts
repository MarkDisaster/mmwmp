import { AiTool, type AiToolMetadata } from '@/ai/tools/ai-tool.decorator';

import { MAX_DISPLAY_NAME_LENGTH } from '../file.constants';
import { fileDisplayName, normalizeDisplayName } from '../file-display-name';
import { UpdateFileTool } from '../tools/update-file.tool';
import { UpdateFilesTool } from '../tools/update-files.tool';

describe('fileDisplayName', () => {
   it('takes the display name, or the original name without one', () => {
      expect(fileDisplayName({ displayName: 'Cat', originalName: 'cat.png' })).toBe('Cat');
      expect(fileDisplayName({ displayName: null, originalName: 'cat.png' })).toBe('cat.png');
   });

   it('takes the original name for an empty display name stored before the normalisation', () => {
      expect(fileDisplayName({ displayName: '', originalName: 'cat.png' })).toBe('cat.png');
   });
});

describe('normalizeDisplayName', () => {
   it('trims the name and stores a blank one as null', () => {
      expect(normalizeDisplayName('  Cat  ')).toBe('Cat');
      expect(normalizeDisplayName('  ')).toBeNull();
      expect(normalizeDisplayName('')).toBeNull();
      expect(normalizeDisplayName(null)).toBeNull();
      expect(normalizeDisplayName(undefined)).toBeNull();
   });
});

describe('the display name in the file tools', () => {
   const schemaOf = (tool: object) =>
      (Reflect.getMetadata(AiTool.KEY, tool) as AiToolMetadata).inputSchema;

   it.each([
      [
         'updateFile',
         (displayName: string) => schemaOf(UpdateFileTool).safeParse({ id: 1, displayName }),
      ],
      [
         'updateFiles',
         (displayName: string) =>
            schemaOf(UpdateFilesTool).safeParse({
               files: [{ id: 1, currentName: 'cat.png', displayName }],
            }),
      ],
   ])('%s refuses a blank name and one over the limit', (_name, parse) => {
      expect(parse('  ').success).toBe(false);
      expect(parse('a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)).success).toBe(false);
      expect(parse('  Cat  ').success).toBe(true);
   });
});
