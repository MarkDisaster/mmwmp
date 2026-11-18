import sharp from 'sharp';

import { createTestDocx, createTestJpeg, createTestZip, pngChunk } from '../../../test/setup/files';
import { detectFileType } from '../detect-file-type';

describe('detectFileType', () => {
   it('finds the type in the bytes of an image', async () => {
      expect(await detectFileType(await createTestJpeg())).toBe('image/jpeg');
      const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
         .png()
         .toBuffer();
      expect(await detectFileType(png)).toBe('image/png');
   });

   it('finds a PDF, a ZIP and a Word document', async () => {
      expect(await detectFileType(Buffer.from('%PDF-1.4\n%%EOF'))).toBe('application/pdf');
      expect(await detectFileType(createTestZip({ 'a.txt': 'hello' }))).toBe('application/zip');
      expect(await detectFileType(createTestDocx())).toBe(
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
   });

   it('finds an animated PNG as image/apng', async () => {
      const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } })
         .png()
         .toBuffer();
      const actl = Buffer.alloc(8);
      actl.writeUInt32BE(1, 0);
      const afterHeader = 8 + 25;
      const apng = Buffer.concat([
         png.subarray(0, afterHeader),
         pngChunk('acTL', actl),
         png.subarray(afterHeader),
      ]);

      expect(await detectFileType(apng)).toBe('image/apng');
   });

   it('finds nothing in bytes without a signature, whatever the file claims to be', async () => {
      expect(
         await detectFileType(Buffer.from('<html><script>x()</script></html>')),
      ).toBeUndefined();
      expect(await detectFileType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toBe(
         undefined,
      );
   });
});
