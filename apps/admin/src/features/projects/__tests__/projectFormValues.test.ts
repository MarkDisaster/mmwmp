import { describe, expect, it } from 'vitest';

import type { FileEntity, ProjectEntity } from '@/api/generated';
import { mergeGeneratedTranslation } from '@/utils/translation';

import {
   buildDefaultValues,
   createEmptyTranslation,
   GENERATED_TRANSLATION_FIELDS,
   toGenerateTranslationDto,
   toMediaFiles,
   toProjectMeta,
   toSaveProjectDto,
   toYear,
   withFileLanguage,
} from '../utils/projectFormValues';
import type { ProjectFormValues } from '../validation/projectSchema';

const FILE = { id: 5, originalName: 'shot.png' } as FileEntity;

const formValues = (overrides: Partial<ProjectFormValues> = {}): ProjectFormValues => ({
   ...buildDefaultValues(),
   ...overrides,
});

describe('toYear', () => {
   it('should turn an empty input into null and a year into a number', () => {
      expect(toYear('')).toBeNull();
      expect(toYear('2024')).toBe(2024);
   });
});

describe('toProjectMeta', () => {
   it('should send empty inputs as null, so clearing a field clears it in the DB', () => {
      expect(toProjectMeta(formValues({ company: '  ', startYear: '', endYear: '' }))).toEqual({
         company: null,
         startYear: null,
         endYear: null,
         ongoing: false,
      });
      expect(toProjectMeta(formValues({ company: undefined }))).toMatchObject({ company: null });
   });

   it('should send no end year for a running project, whatever the input still holds', () => {
      expect(
         toProjectMeta(formValues({ startYear: '2020', endYear: '2023', ongoing: true })),
      ).toEqual({ company: null, startYear: 2020, endYear: null, ongoing: true });
   });

   it('should trim the company and convert the years', () => {
      expect(
         toProjectMeta(formValues({ company: ' Acme ', startYear: '2020', endYear: '2023' })),
      ).toEqual({ company: 'Acme', startYear: 2020, endYear: 2023, ongoing: false });
   });
});

describe('buildDefaultValues', () => {
   it('should start a new project with one empty Czech translation and one empty link row', () => {
      expect(buildDefaultValues()).toEqual({
         company: '',
         startYear: '',
         endYear: '',
         ongoing: false,
         links: [{ label: '', url: '' }],
         slug: '',
         thumbnail: null,
         tags: [],
         showOnHomepage: false,
         media: [],
         translations: [createEmptyTranslation('cs')],
      });
   });

   it('should take the running flag of a saved project, which a missing end year does not tell', () => {
      const flag = (startYear: number | null, endYear: number | null, ongoing: boolean) =>
         buildDefaultValues({
            startYear,
            endYear,
            ongoing,
            links: [],
            tags: [],
            media: [],
            translations: [],
         } as unknown as ProjectEntity).ongoing;

      expect(flag(2020, null, true)).toBe(true);
      expect(flag(2020, null, false)).toBe(false);
      expect(flag(2020, 2023, false)).toBe(false);
   });

   it('should fill the form from a saved project', () => {
      const project = {
         company: 'Acme',
         startYear: 2020,
         endYear: null,
         links: [{ id: 1, projectId: 1, label: null, url: 'https://acme.test', sortOrder: 0 }],
         slug: 'acme',
         thumbnailId: 5,
         thumbnail: FILE,
         tags: [
            {
               projectId: 1,
               tagId: 3,
               tag: { id: 3, translations: [{ language: 'cs', name: 'React' }] },
            },
         ],
         showOnHomepage: true,
         media: [{ id: 7, projectId: 1, fileId: 5, language: 'en', sortOrder: 0, file: FILE }],
         translations: [
            {
               id: 1,
               projectId: 1,
               language: 'en',
               title: 'Acme',
               role: null,
               description: 'Description',
               content: null,
               metaTitle: 'Meta',
               metaDescription: null,
            },
         ],
      } as unknown as ProjectEntity;

      expect(buildDefaultValues(project)).toEqual({
         company: 'Acme',
         startYear: '2020',
         endYear: '',
         ongoing: false,
         links: [{ label: '', url: 'https://acme.test' }],
         slug: 'acme',
         thumbnail: FILE,
         tags: [{ id: 3, name: 'React' }],
         showOnHomepage: true,
         media: [{ id: 7, fileId: 5, language: 'en' }],
         translations: [
            {
               language: 'en',
               title: 'Acme',
               role: '',
               description: 'Description',
               content: '',
               metaTitle: 'Meta',
               metaDescription: '',
            },
         ],
      });
   });

   it('should give a saved project without translations the empty Czech translation', () => {
      const project = { tags: [], media: [], translations: [] } as unknown as ProjectEntity;
      expect(buildDefaultValues(project).translations).toEqual([createEmptyTranslation('cs')]);
   });

   it('should name the tags in the UI language and fall back to Czech', () => {
      const project = {
         tags: [
            {
               tag: {
                  id: 3,
                  translations: [
                     { language: 'cs', name: 'Případová studie' },
                     { language: 'en', name: 'Case study' },
                  ],
               },
            },
            { tag: { id: 4, translations: [{ language: 'cs', name: 'Návrh' }] } },
         ],
         media: [],
         links: [],
         translations: [],
      } as unknown as ProjectEntity;

      expect(buildDefaultValues(project, 'en-US').tags).toEqual([
         { id: 3, name: 'Case study' },
         { id: 4, name: 'Návrh' },
      ]);
      expect(buildDefaultValues(project, 'cs').tags[0]?.name).toBe('Případová studie');
   });
});

describe('toMediaFiles', () => {
   it('should map the files of the saved media rows by their id', () => {
      const other = { id: 9, originalName: 'clip.mp4' } as FileEntity;
      const media = [
         { id: 7, projectId: 1, fileId: 5, language: 'en', sortOrder: 0, file: FILE },
         { id: 8, projectId: 1, fileId: 9, language: null, sortOrder: 1, file: other },
         { id: 9, projectId: 1, fileId: 11, language: null, sortOrder: 2 },
      ] as ProjectEntity['media'];

      expect(toMediaFiles(media)).toEqual(
         new Map([
            [5, FILE],
            [9, other],
         ]),
      );
   });

   it('should give a new project no files', () => {
      expect(toMediaFiles().size).toBe(0);
   });
});

describe('withFileLanguage', () => {
   const change = { fileId: 5, from: 'en', to: 'cs' } as const;

   it('should keep the rows when the language did not change', () => {
      const media = [{ id: 7, fileId: 5, language: 'en' as const }];
      expect(withFileLanguage(media, media, { fileId: 5, from: 'en', to: 'en' })).toBe(media);
   });

   it('should move only the rows of the file that had its old language', () => {
      const other = { id: 8, fileId: 5, language: null };
      const otherFile = { id: 9, fileId: 6, language: 'en' as const };
      const result = withFileLanguage(
         [{ id: 7, fileId: 5, language: 'en' }, other, otherFile],
         [],
         change,
      );
      expect(result).toEqual([{ fileId: 5, language: 'cs' }, other, otherFile]);
      expect(result[1]).toBe(other);
      expect(result[2]).toBe(otherFile);
   });

   it('should change the language of a new row and of a row shown in all languages', () => {
      expect(
         withFileLanguage([{ fileId: 5, language: null }], [], { fileId: 5, from: null, to: 'en' }),
      ).toEqual([{ fileId: 5, language: 'en' }]);
   });

   it('should restore the saved id of a row back in its stored language', () => {
      const saved = [{ id: 7, fileId: 5, language: 'cs' as const }];
      expect(withFileLanguage([{ fileId: 5, language: 'en' }], saved, change)).toEqual(saved);
   });

   it('should not give a saved id to a second row while another row holds it', () => {
      const saved = [{ id: 7, fileId: 5, language: 'cs' as const }];
      expect(
         withFileLanguage(
            [
               { id: 7, fileId: 5, language: 'cs' },
               { fileId: 5, language: 'en' },
            ],
            saved,
            change,
         ),
      ).toEqual([
         { id: 7, fileId: 5, language: 'cs' },
         { fileId: 5, language: 'cs' },
      ]);
   });
});

describe('toSaveProjectDto', () => {
   const translation = {
      ...createEmptyTranslation('cs'),
      title: 'Projekt',
      description: '<p>Popis</p>',
      content: '<p>Obsah</p>',
   };

   it('should send every key of a new project, empty inputs as null and no status', () => {
      expect(
         toSaveProjectDto(formValues({ slug: 'projekt', translations: [translation] })),
      ).toEqual({
         slug: 'projekt',
         thumbnailId: null,
         showOnHomepage: false,
         company: null,
         startYear: null,
         endYear: null,
         ongoing: false,
         translations: [
            {
               language: 'cs',
               title: 'Projekt',
               role: null,
               description: '<p>Popis</p>',
               content: '<p>Obsah</p>',
               metaTitle: null,
               metaDescription: null,
            },
         ],
         tagIds: [],
         links: [],
         media: [],
      });
   });

   it('should send the thumbnail id, the tag ids and the links in their order', () => {
      const dto = toSaveProjectDto(
         formValues({
            thumbnail: FILE,
            tags: [
               { id: 3, name: 'React' },
               { id: 1, name: 'Vue' },
            ],
            links: [
               { label: '', url: 'https://example.com' },
               { label: '', url: '  ' },
               { label: 'GitHub', url: 'https://github.com/x' },
            ],
         }),
      );

      expect(dto).toMatchObject({
         thumbnailId: 5,
         tagIds: [3, 1],
         links: [
            { label: null, url: 'https://example.com' },
            { label: 'GitHub', url: 'https://github.com/x' },
         ],
      });
   });

   it('should keep a saved media row by its id alone and add a new one by file and language', () => {
      const dto = toSaveProjectDto(
         formValues({
            media: [
               { fileId: 9, language: null },
               { id: 7, fileId: 5, language: 'en' },
               { fileId: 5, language: 'cs' },
            ],
         }),
      );

      expect(dto.media).toEqual([
         { fileId: 9, language: null },
         { id: 7 },
         { fileId: 5, language: 'cs' },
      ]);
   });

   it('should send every language in its order and trim the role', () => {
      const dto = toSaveProjectDto(
         formValues({
            translations: [
               { ...translation, role: ' Developer ', metaTitle: 'Meta' },
               { ...translation, language: 'en', title: 'Project' },
            ],
         }),
      );

      expect(dto.translations).toEqual([
         expect.objectContaining({ language: 'cs', role: 'Developer', metaTitle: 'Meta' }),
         expect.objectContaining({ language: 'en', title: 'Project', role: null }),
      ]);
   });

   it('should add the status only when it is given', () => {
      expect(toSaveProjectDto(formValues(), { status: 'published' })).toMatchObject({
         status: 'published',
      });
      expect(toSaveProjectDto(formValues(), {})).not.toHaveProperty('status');
   });
});

describe('GENERATED_TRANSLATION_FIELDS', () => {
   it('should take the generated fields and keep the ones the AI left empty and the role', () => {
      expect(
         mergeGeneratedTranslation(
            { ...createEmptyTranslation('en'), role: 'Developer', metaTitle: 'Kept' },
            { title: 'Project', description: '<p>Text</p>', content: null, metaTitle: '' },
            GENERATED_TRANSLATION_FIELDS,
         ),
      ).toEqual({
         language: 'en',
         title: 'Project',
         role: 'Developer',
         description: '<p>Text</p>',
         content: '',
         metaTitle: 'Kept',
         metaDescription: '',
      });
   });
});

describe('toGenerateTranslationDto', () => {
   it('should send the generated fields of the Czech translation, the empty ones as null', () => {
      expect(
         toGenerateTranslationDto({
            ...createEmptyTranslation('cs'),
            title: 'Eshop',
            role: 'Vývojář',
            content: '<p>Obsah eshopu</p>',
            metaTitle: undefined,
         }),
      ).toEqual({
         title: 'Eshop',
         description: null,
         content: '<p>Obsah eshopu</p>',
         metaTitle: null,
         metaDescription: null,
      });
   });
});
