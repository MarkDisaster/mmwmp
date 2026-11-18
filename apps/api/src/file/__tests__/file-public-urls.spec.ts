import { FileVariantType } from '@/generated/prisma/enums';

import { toFileWithUrls } from '../file-public-urls';

describe('toFileWithUrls', () => {
   const storage = { getPublicUrl: (key: string) => `https://cdn/${key}` };

   it('should take the URL of the file from its original variant', () => {
      const file = {
         id: 1,
         storagePath: 'uploads/uuid',
         variants: [
            { variant: FileVariantType.thumbnail, storagePath: 'uploads/uuid/thumbnail.webp' },
            { variant: FileVariantType.original, storagePath: 'uploads/uuid/original.jpg' },
         ],
      };

      const mapped = toFileWithUrls(file, storage);

      expect(mapped.publicUrl).toBe('https://cdn/uploads/uuid/original.jpg');
      expect(mapped.variants.map((v) => v.publicUrl)).toEqual([
         'https://cdn/uploads/uuid/thumbnail.webp',
         'https://cdn/uploads/uuid/original.jpg',
      ]);
      expect(mapped.id).toBe(1);
   });

   it('should take the URL of a file without an original variant from its storage path', () => {
      const mapped = toFileWithUrls(
         { storagePath: 'uploads/uuid/original.pdf', variants: [] },
         storage,
      );

      expect(mapped.publicUrl).toBe('https://cdn/uploads/uuid/original.pdf');
      expect(mapped.variants).toEqual([]);
   });
});
