import { describe, expect, it } from 'vitest';

import apiSchema from '@/api/schema.json';

import { MAX_PROJECT_LINKS, projectSchema } from '../validation/projectSchema';

const parseLinks = (links: Array<{ label?: string; url: string }>) =>
   projectSchema.shape.links.safeParse(links);

const filled = (count: number) =>
   Array.from({ length: count }, (_, i) => ({ label: '', url: `https://example.com/${i}` }));

describe('projectSchema links', () => {
   it('should accept a row with a stored label and a cleared URL, which is dropped on submit', () => {
      expect(parseLinks([{ label: 'Live', url: '  ' }]).success).toBe(true);
   });

   it('should accept a fully blank row, which is dropped on submit', () => {
      expect(parseLinks([{ label: '  ', url: '' }]).success).toBe(true);
   });

   it('should accept a link with or without a label', () => {
      expect(
         parseLinks([
            { label: 'GitHub', url: 'https://github.com/x' },
            { url: 'https://example.com' },
         ]).success,
      ).toBe(true);
   });

   it(`should accept ${MAX_PROJECT_LINKS} links and reject one more`, () => {
      expect(parseLinks(filled(MAX_PROJECT_LINKS)).success).toBe(true);
      expect(parseLinks(filled(MAX_PROJECT_LINKS + 1)).success).toBe(false);
   });
});

const translation = {
   language: 'cs',
   title: 'Projekt',
   description: 'Popis',
   content: '<p>Obsah</p>',
};

const parseProject = (overrides: Record<string, unknown> = {}) =>
   projectSchema.safeParse({
      startYear: '',
      endYear: '',
      ongoing: false,
      links: [],
      slug: 'projekt',
      thumbnail: null,
      tags: [],
      showOnHomepage: false,
      media: [],
      translations: [translation],
      ...overrides,
   });

const issuePaths = (result: ReturnType<typeof parseProject>) =>
   result.error?.issues.map((issue) => issue.path.join('.')) ?? [];

describe('projectSchema ongoing', () => {
   it('should accept a running project with a start year and no end year', () => {
      expect(parseProject({ startYear: '2024', endYear: '', ongoing: true }).success).toBe(true);
   });

   it('should refuse a running project without a start year', () => {
      expect(issuePaths(parseProject({ startYear: '', ongoing: true }))).toEqual(['ongoing']);
   });

   it('should accept a start year alone: neither finished nor running', () => {
      expect(parseProject({ startYear: '2024', endYear: '', ongoing: false }).success).toBe(true);
   });

   it('should not ask for an end year when there is no start year', () => {
      expect(parseProject({ startYear: '', endYear: '', ongoing: false }).success).toBe(true);
   });
});

describe('projectSchema years', () => {
   it('should accept empty years and a range within the limits', () => {
      expect(parseProject().success).toBe(true);
      expect(parseProject({ startYear: '1990', endYear: '2100' }).success).toBe(true);
      expect(parseProject({ startYear: '2020' }).success).toBe(true);
      expect(parseProject({ startYear: '2020', endYear: '2020' }).success).toBe(true);
   });

   it('should reject a year that is not four digits or out of the limits', () => {
      for (const startYear of ['1989', '2101', '202', '20a4', ' 2020']) {
         expect(issuePaths(parseProject({ startYear }))).toEqual(['startYear']);
      }
   });

   it('should reject an end year without a start year', () => {
      expect(issuePaths(parseProject({ endYear: '2020' }))).toEqual(['endYear']);
   });

   it('should reject an end year before the start year', () => {
      expect(issuePaths(parseProject({ startYear: '2021', endYear: '2020' }))).toEqual(['endYear']);
   });
});

describe('projectSchema slug', () => {
   it('should reject an empty or blank slug and trim a filled one', () => {
      expect(issuePaths(parseProject({ slug: '' }))).toEqual(['slug']);
      expect(issuePaths(parseProject({ slug: '   ' }))).toEqual(['slug']);
      expect(parseProject({ slug: ' projekt ' }).data?.slug).toBe('projekt');
   });

   it('should accept the slug format of the API only', () => {
      expect(parseProject({ slug: 'muj-projekt-2' }).success).toBe(true);
      for (const slug of ['Muj-projekt', 'můj-projekt', 'muj projekt', '-projekt', 'a--b', 'b-']) {
         expect(issuePaths(parseProject({ slug }))).toEqual(['slug']);
      }
   });
});

describe('projectSchema translation language', () => {
   it('should accept the supported languages only', () => {
      expect(parseProject({ translations: [{ ...translation, language: 'en' }] }).success).toBe(
         true,
      );
      expect(
         issuePaths(parseProject({ translations: [{ ...translation, language: 'de' }] })),
      ).toEqual(['translations.0.language']);
   });
});

describe('projectSchema translation texts', () => {
   it('should reject a blank title, description or content and trim the filled ones', () => {
      for (const field of ['title', 'description', 'content']) {
         expect(
            issuePaths(parseProject({ translations: [{ ...translation, [field]: '  ' }] })),
         ).toEqual([`translations.0.${field}`]);
      }
      expect(
         parseProject({ translations: [{ ...translation, title: ' Projekt ' }] }).data
            ?.translations[0]?.title,
      ).toBe('Projekt');
   });

   it('should reject content of blank paragraphs only', () => {
      for (const content of ['<p></p>', '<p> </p>', '<p>&nbsp;</p><p><br></p>']) {
         expect(issuePaths(parseProject({ translations: [{ ...translation, content }] }))).toEqual([
            'translations.0.content',
         ]);
      }
   });

   it('should accept content with text, an image or a divider only', () => {
      for (const content of ['<p> x </p>', '<p><img src="/a.png"></p>', '<hr>']) {
         expect(parseProject({ translations: [{ ...translation, content }] }).success).toBe(true);
      }
   });
});

describe('projectSchema media', () => {
   it('should accept saved and new rows with a supported language or none', () => {
      expect(
         parseProject({
            media: [
               { id: 1, fileId: 5, language: 'cs' },
               { fileId: 6, language: null },
            ],
         }).success,
      ).toBe(true);
      expect(issuePaths(parseProject({ media: [{ fileId: 6, language: 'de' }] }))).toEqual([
         'media.0.language',
      ]);
   });
});

describe('projectSchema limits of the API', () => {
   const { SaveProjectDto, SaveProjectTranslationDto, ProjectLinkDto } =
      apiSchema.components.schemas;
   const { shape } = projectSchema;

   it('should accept the longest company the API accepts and reject a longer one', () => {
      const max = SaveProjectDto.properties.company.maxLength;
      expect(shape.company.safeParse('x'.repeat(max)).success).toBe(true);
      expect(shape.company.safeParse('x'.repeat(max + 1)).success).toBe(false);
   });

   it('should accept the years the API accepts and reject the ones around them', () => {
      for (const [field, year] of [
         ['startYear', SaveProjectDto.properties.startYear],
         ['endYear', SaveProjectDto.properties.endYear],
      ] as const) {
         expect(shape[field].safeParse(String(year.minimum)).success).toBe(true);
         expect(shape[field].safeParse(String(year.maximum)).success).toBe(true);
         expect(shape[field].safeParse(String(year.minimum - 1)).success).toBe(false);
         expect(shape[field].safeParse(String(year.maximum + 1)).success).toBe(false);
      }
   });

   it('should accept as many links as the API accepts and reject one more', () => {
      const max = SaveProjectDto.properties.links.maxItems;
      expect(parseLinks(filled(max)).success).toBe(true);
      expect(parseLinks(filled(max + 1)).success).toBe(false);
   });

   it('should accept the longest link label the API accepts and reject a longer one', () => {
      const max = ProjectLinkDto.properties.label.maxLength;
      const label = shape.links.element.shape.label;
      expect(label.safeParse('x'.repeat(max)).success).toBe(true);
      expect(label.safeParse('x'.repeat(max + 1)).success).toBe(false);
   });

   it('should accept the longest role the API accepts and reject a longer one', () => {
      const max = SaveProjectTranslationDto.properties.role.maxLength;
      const role = shape.translations.element.shape.role;
      expect(role.safeParse('x'.repeat(max)).success).toBe(true);
      expect(role.safeParse('x'.repeat(max + 1)).success).toBe(false);
   });
});
