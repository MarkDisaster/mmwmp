import { describe, expect, it } from 'vitest';

import type { ServiceEntity } from '@/api/generated';
import { mergeGeneratedTranslation } from '@/utils/translation';

import {
   buildDefaultValues,
   createEmptyTranslation,
   GENERATED_TRANSLATION_FIELDS,
   toGenerateTranslationDto,
   toSaveServiceDto,
} from '../utils/serviceFormValues';
import type { ServiceFormValues } from '../validation/serviceSchema';

const formValues = (overrides: Partial<ServiceFormValues> = {}): ServiceFormValues => ({
   ...buildDefaultValues(),
   ...overrides,
});

const SERVICE = {
   id: 3,
   slug: 'web',
   showOnHomepage: true,
   status: 'published',
   translations: [
      { id: 1, serviceId: 3, language: 'cs', title: 'Web', description: null, content: '<p>x</p>' },
   ],
   projects: [
      {
         serviceId: 3,
         projectId: 7,
         sortOrder: 0,
         project: {
            id: 7,
            slug: 'shop',
            translations: [
               { language: 'cs', title: 'Obchod' },
               { language: 'en', title: 'Shop' },
            ],
         },
      },
   ],
} as unknown as ServiceEntity;

describe('buildDefaultValues', () => {
   it('should start a new service with an empty Czech translation and no projects', () => {
      expect(buildDefaultValues()).toEqual({
         slug: '',
         showOnHomepage: false,
         projects: [],
         translations: [createEmptyTranslation('cs')],
      });
   });

   it('should turn a saved service into form values, project titles in the UI language', () => {
      expect(buildDefaultValues(SERVICE, 'en-US')).toEqual({
         slug: 'web',
         showOnHomepage: true,
         projects: [{ id: 7, title: 'Shop' }],
         translations: [
            {
               language: 'cs',
               title: 'Web',
               description: '',
               content: '<p>x</p>',
               metaTitle: '',
               metaDescription: '',
            },
         ],
      });
   });

   it('should fill the SEO fields of a saved translation', () => {
      const service = {
         ...SERVICE,
         translations: [
            { ...SERVICE.translations[0], metaTitle: 'SEO', metaDescription: 'Popis pro SEO' },
         ],
      } as ServiceEntity;
      expect(buildDefaultValues(service).translations[0]).toMatchObject({
         metaTitle: 'SEO',
         metaDescription: 'Popis pro SEO',
      });
   });
});

describe('toSaveServiceDto', () => {
   it('should send the whole form with the project ids in the order shown', () => {
      const values = formValues({
         slug: 'web',
         showOnHomepage: true,
         projects: [
            { id: 9, title: 'B' },
            { id: 2, title: 'A' },
         ],
         translations: [
            { language: 'cs', title: 'Web', description: 'Popis', content: '<p>x</p>' },
         ],
      });
      expect(toSaveServiceDto(values)).toEqual({
         slug: 'web',
         showOnHomepage: true,
         translations: [
            {
               language: 'cs',
               title: 'Web',
               description: 'Popis',
               content: '<p>x</p>',
               metaTitle: null,
               metaDescription: null,
            },
         ],
         projectIds: [9, 2],
      });
   });

   it('should leave the status out of a plain save and set it when publishing', () => {
      expect(toSaveServiceDto(formValues())).not.toHaveProperty('status');
      expect(toSaveServiceDto(formValues(), { status: 'published' })).toMatchObject({
         status: 'published',
      });
   });

   it('should send empty texts as null and every language in its order', () => {
      const values = formValues({
         translations: [
            { language: 'cs', title: 'Web', description: '', content: '' },
            { language: 'en', title: 'Web', description: 'Kept', content: '', metaTitle: 'SEO' },
         ],
      });
      expect(toSaveServiceDto(values).translations).toEqual([
         {
            language: 'cs',
            title: 'Web',
            description: null,
            content: null,
            metaTitle: null,
            metaDescription: null,
         },
         {
            language: 'en',
            title: 'Web',
            description: 'Kept',
            content: null,
            metaTitle: 'SEO',
            metaDescription: null,
         },
      ]);
   });
});

describe('GENERATED_TRANSLATION_FIELDS', () => {
   it('should take the generated fields and keep the ones the AI left empty', () => {
      const translation = { language: 'en', title: '', description: 'Mine', content: '' } as const;
      expect(
         mergeGeneratedTranslation(
            translation,
            { title: 'Web', description: null, content: '<p>y</p>' },
            GENERATED_TRANSLATION_FIELDS,
         ),
      ).toEqual({ language: 'en', title: 'Web', description: 'Mine', content: '<p>y</p>' });
   });
});

describe('toGenerateTranslationDto', () => {
   it('should send the Czech translation, its empty fields as null', () => {
      expect(
         toGenerateTranslationDto({
            language: 'cs',
            title: 'Web',
            description: '',
            content: '<p>x</p>',
         }),
      ).toEqual({ title: 'Web', description: null, content: '<p>x</p>' });
   });
});
