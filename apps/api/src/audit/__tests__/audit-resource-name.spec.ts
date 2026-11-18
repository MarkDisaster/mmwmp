import { resolveResourceName } from '../audit.interceptor';

describe('resolveResourceName', () => {
   it('should prefer the title, then the name', () => {
      expect(resolveResourceName({ title: 'Project', name: 'Other', slug: 'project' })).toBe(
         'Project',
      );
      expect(resolveResourceName({ name: 'Role', slug: 'role' })).toBe('Role');
   });

   it('should take the Czech name of a translated tag before its slug', () => {
      const tag = {
         slug: 'case-study',
         translations: [
            { language: 'en', name: 'Case study' },
            { language: 'cs', name: 'Případová studie' },
         ],
      };

      expect(resolveResourceName(tag)).toBe('Případová studie');
   });

   it('should fall back to the first translation with a name when there is no Czech one', () => {
      expect(
         resolveResourceName({
            slug: 'x',
            translations: [{ language: 'en', name: 'Only English' }],
         }),
      ).toBe('Only English');
   });

   it('should use the slug when nothing is named and null for a response without one', () => {
      expect(resolveResourceName({ slug: 'only-slug', translations: [] })).toBe('only-slug');
      expect(resolveResourceName(null)).toBeNull();
      expect(resolveResourceName({})).toBeNull();
   });
});
