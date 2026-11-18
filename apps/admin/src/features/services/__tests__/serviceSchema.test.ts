import { describe, expect, it } from 'vitest';

import { serviceSchema } from '../validation/serviceSchema';

const parseService = (title: string) =>
   serviceSchema.safeParse({
      slug: 'web',
      showOnHomepage: false,
      projects: [],
      translations: [{ language: 'cs', title, description: '', content: '' }],
   });

describe('serviceSchema translation title', () => {
   it('should reject a blank title', () => {
      expect(parseService('   ').error?.issues.map((issue) => issue.path.join('.'))).toEqual([
         'translations.0.title',
      ]);
   });

   it('should trim a filled title and accept empty optional texts', () => {
      expect(parseService(' Web ').data?.translations[0]).toEqual({
         language: 'cs',
         title: 'Web',
         description: '',
         content: '',
      });
   });
});

describe('serviceSchema translation SEO fields', () => {
   it('should accept the meta title and description and keep them as typed', () => {
      const result = serviceSchema.safeParse({
         slug: 'web',
         showOnHomepage: false,
         projects: [],
         translations: [
            { language: 'cs', title: 'Web', metaTitle: 'SEO titulek', metaDescription: 'Popis' },
         ],
      });
      expect(result.data?.translations[0]).toMatchObject({
         metaTitle: 'SEO titulek',
         metaDescription: 'Popis',
      });
   });
});
