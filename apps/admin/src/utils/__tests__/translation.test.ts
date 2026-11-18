import { describe, expect, it } from 'vitest';

import {
   getGeneratedFields,
   getLanguageToShowErrors,
   getRemovableLanguages,
   getTranslationTitle,
   mergeGeneratedTranslation,
} from '../translation';

const entity = {
   translations: [
      { language: 'cs', title: 'Projekt' },
      { language: 'en', title: 'Project' },
   ],
};

describe('getTranslationTitle', () => {
   it('should return the title in the given language', () => {
      expect(getTranslationTitle(entity, 'en')).toBe('Project');
      expect(getTranslationTitle(entity, 'cs')).toBe('Projekt');
   });

   it('should match a regional UI language by its base code', () => {
      expect(getTranslationTitle(entity, 'en-US')).toBe('Project');
   });

   it('should fall back to the first translation', () => {
      expect(getTranslationTitle(entity, 'de')).toBe('Projekt');
      expect(getTranslationTitle(entity)).toBe('Projekt');
   });

   it('should return a dash without translations', () => {
      expect(getTranslationTitle({ translations: [] }, 'cs')).toBe('—');
   });
});

describe('getLanguageToShowErrors', () => {
   const languages = ['cs', 'en'] as const;

   it('should keep the active language when its translation has errors', () => {
      expect(getLanguageToShowErrors(languages, 'en', [{ title: {} }, { title: {} }])).toBe('en');
   });

   it('should show the first language with errors when the active one has none', () => {
      expect(getLanguageToShowErrors(languages, 'cs', [undefined, { title: {} }])).toBe('en');
   });

   it('should keep the active language when only shared fields have errors', () => {
      expect(getLanguageToShowErrors(languages, 'en', undefined)).toBe('en');
      expect(getLanguageToShowErrors(languages, 'en', [])).toBe('en');
   });
});

describe('getRemovableLanguages', () => {
   it('should return the languages added since the last save', () => {
      expect(getRemovableLanguages(['cs', 'en'], ['cs'], 'cs')).toEqual(['en']);
   });

   it('should keep the stored languages and the primary one', () => {
      expect(getRemovableLanguages(['cs', 'en'], ['cs', 'en'], 'cs')).toEqual([]);
      expect(getRemovableLanguages(['cs'], [], 'cs')).toEqual([]);
   });

   it('should allow every added language of a record that is not saved yet', () => {
      expect(getRemovableLanguages(['cs', 'en'], [], 'cs')).toEqual(['en']);
   });
});

const FIELDS = ['title', 'description', 'content'] as const;

describe('getGeneratedFields', () => {
   it('should return the fields the AI filled in, without the null and empty ones', () => {
      expect(getGeneratedFields({ title: 'Web', description: null, content: '' }, FIELDS)).toEqual({
         title: 'Web',
      });
   });

   it('should ignore a field the AI answer has but the entity does not generate', () => {
      const answer = { title: 'Web', metaTitle: 'Meta' };
      expect(getGeneratedFields(answer, FIELDS)).toEqual({ title: 'Web' });
   });
});

describe('mergeGeneratedTranslation', () => {
   it('should overwrite the filled fields only, and keep the other fields of the row', () => {
      const translation = {
         language: 'en',
         title: 'Old',
         description: 'Mine',
         content: '',
         role: 'Dev',
      };
      expect(
         mergeGeneratedTranslation(
            translation,
            { title: 'Web', description: null, content: '<p>y</p>' },
            FIELDS,
         ),
      ).toEqual({
         language: 'en',
         title: 'Web',
         description: 'Mine',
         content: '<p>y</p>',
         role: 'Dev',
      });
   });

   it('should not change the given translation', () => {
      const translation = { title: 'Old' };
      mergeGeneratedTranslation(translation, { title: 'New' }, FIELDS);
      expect(translation).toEqual({ title: 'Old' });
   });
});
