import { describe, expect, it } from 'vitest';

import type { TagEntity } from '@/api/generated';

import { buildDefaultValues, createEmptyTranslation, toSaveTagDto } from '../utils/tagFormValues';

const tag = (translations: TagEntity['translations']) =>
   ({ id: 1, slug: 'studie', color: null, translations }) as TagEntity;

describe('buildDefaultValues', () => {
   it('should start a new tag with an empty Czech name', () => {
      expect(buildDefaultValues()).toMatchObject({
         slug: '',
         translations: [createEmptyTranslation('cs')],
      });
   });

   it('should carry both names of a saved tag and the default colour for none', () => {
      expect(
         buildDefaultValues(
            tag([
               { language: 'cs', name: 'Studie' },
               { language: 'en', name: 'Study' },
            ]),
         ),
      ).toEqual({
         slug: 'studie',
         color: '#0130fe',
         translations: [
            { language: 'cs', name: 'Studie' },
            { language: 'en', name: 'Study' },
         ],
      });
   });
});

describe('toSaveTagDto', () => {
   it('should send the complete set of names, trimmed, and no empty colour', () => {
      expect(
         toSaveTagDto({
            slug: 'studie',
            color: '',
            translations: [{ language: 'cs', name: ' Studie ' }],
         }),
      ).toEqual({
         slug: 'studie',
         color: undefined,
         translations: [{ language: 'cs', name: 'Studie' }],
      });
   });
});
