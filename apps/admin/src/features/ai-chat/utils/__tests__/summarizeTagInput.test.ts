import { describe, expect, it } from 'vitest';

import { summarizeTagInput } from '../summarizeTagInput';

const CS_NAME = 'Případová studie';
const TAG_NAME = 'chat.approval.tagName' as const;

describe('summarizeTagInput', () => {
   it('should list the slug and the names in both languages of createTag', () => {
      expect(
         summarizeTagInput('createTag', {
            slug: 'pripadova-studie',
            translations: [
               { language: 'cs', name: CS_NAME },
               { language: 'en', name: 'Case study' },
            ],
            color: '#0130fe',
         }),
      ).toEqual([
         { key: 'chat.approval.tagSlug', params: { slug: 'pripadova-studie' } },
         { key: TAG_NAME, params: { language: 'cs', name: CS_NAME } },
         { key: TAG_NAME, params: { language: 'en', name: 'Case study' } },
         { key: 'chat.approval.tagColor', params: { color: '#0130fe' } },
      ]);
   });

   it('should name the tag, the changed name and the removed English name of updateTag', () => {
      expect(
         summarizeTagInput('updateTag', {
            id: 7,
            currentName: CS_NAME,
            translations: [{ language: 'cs', name: 'Případovka' }],
            removeLanguages: ['en'],
         }),
      ).toEqual([
         { key: 'chat.approval.tagLabel', params: { name: CS_NAME, id: 7 } },
         { key: TAG_NAME, params: { language: 'cs', name: 'Případovka' } },
         { key: 'chat.approval.tagNameRemoved', params: { language: 'en' } },
      ]);
   });

   it('should show which tag is deleted, by its name, or by the id alone without a name', () => {
      expect(summarizeTagInput('deleteTag', { id: 7, currentName: CS_NAME })).toEqual([
         { key: 'chat.approval.tagLabel', params: { name: CS_NAME, id: 7 } },
      ]);
      expect(summarizeTagInput('deleteTag', { id: 7 })).toEqual([
         { key: 'chat.approval.tagTarget', params: { id: 7 } },
      ]);
   });

   it('should answer null for other tools, other inputs and an empty change', () => {
      expect(summarizeTagInput('deleteTag', {})).toBeNull();
      expect(summarizeTagInput('restoreTag', { id: 1 })).toBeNull();
      expect(summarizeTagInput('createTag', 'forged')).toBeNull();
      expect(summarizeTagInput('createTag', null)).toBeNull();
      expect(summarizeTagInput('updateTag', {})).toBeNull();
   });

   it('should ignore a language it does not know and a name that is not text', () => {
      expect(
         summarizeTagInput('createTag', {
            slug: 'a',
            translations: [
               { language: 'de', name: 'A' },
               { language: 'cs', name: 5 },
            ],
         }),
      ).toEqual([{ key: 'chat.approval.tagSlug', params: { slug: 'a' } }]);
   });
});
