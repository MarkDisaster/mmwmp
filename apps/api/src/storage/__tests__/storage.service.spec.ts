import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

import { createPngClaiming, pngChunk } from '../../../test/setup/files';
import { InvalidImageError } from '../invalid-image.error';
import { StorageService } from '../storage.service';

type Put = { Key: string; Body: Buffer; ContentType: string };

const config = {
   getOrThrow: (key: string) =>
      ({
         'storage.bucket': 'bucket',
         'storage.publicUrl': 'https://cdn.example.com',
         'storage.endpoint': 'http://localhost:9000',
         'storage.accessKeyId': 'key',
         'storage.secretAccessKey': 'secret',
      })[key],
   get: () => false,
} as unknown as ConfigService;

const phonePhoto = () =>
   sharp({ create: { width: 40, height: 20, channels: 3, background: '#888888' } })
      .jpeg()
      .withMetadata({
         orientation: 6,
         exif: {
            IFD3: {
               GPSLatitudeRef: 'N',
               GPSLatitude: '50/1 5/1 30/1',
               GPSLongitudeRef: 'E',
               GPSLongitude: '14/1 25/1 0/1',
            },
         },
      })
      .toBuffer();

describe('StorageService', () => {
   let puts: Put[];
   let service: StorageService;

   beforeEach(() => {
      puts = [];
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(((command: unknown) => {
         if (command instanceof PutObjectCommand) puts.push(command.input as Put);
         return Promise.resolve({});
      }) as never);
      service = new StorageService(config);
   });

   afterEach(() => jest.restoreAllMocks());

   describe('uploadOriginalImage', () => {
      it('re-encodes a JPEG with its orientation applied and without the EXIF (GPS)', async () => {
         const photo = await phonePhoto();
         expect((await sharp(photo).metadata()).exif).toBeDefined();

         const result = await service.uploadOriginalImage(photo, 'uploads/abc');

         const stored = puts[0];
         expect(stored.Key).toBe('uploads/abc/original.jpg');
         expect(stored.ContentType).toBe('image/jpeg');
         const meta = await sharp(stored.Body).metadata();
         expect(meta.exif).toBeUndefined();
         expect([meta.width, meta.height]).toEqual([20, 40]);
         expect([result.width, result.height]).toEqual([20, 40]);
         expect(result.size).toBe(stored.Body.byteLength);
      });

      it('stores an image under the type sharp finds in its bytes', async () => {
         const webp = await sharp({
            create: { width: 4, height: 4, channels: 3, background: '#fff' },
         })
            .webp()
            .toBuffer();

         const result = await service.uploadOriginalImage(webp, 'uploads/abc');

         expect(puts[0].Key).toBe('uploads/abc/original.webp');
         expect(puts[0].ContentType).toBe('image/webp');
         expect(result.mimeType).toBe('image/webp');
         expect(puts[0].Body).toBe(webp);
      });

      it('rejects bytes that are not an image', async () => {
         await expect(
            service.uploadOriginalImage(
               Buffer.from('GIF89a<html><script>x()</script>'),
               'uploads/a',
            ),
         ).rejects.toBeInstanceOf(InvalidImageError);
         expect(puts).toHaveLength(0);
      });

      it('rejects a truncated JPEG', async () => {
         const jpeg = await sharp({
            create: { width: 64, height: 64, channels: 3, background: '#808080' },
         })
            .jpeg()
            .toBuffer();

         await expect(
            service.uploadOriginalImage(jpeg.subarray(0, jpeg.length - 40), 'uploads/a'),
         ).rejects.toBeInstanceOf(InvalidImageError);
         expect(puts).toHaveLength(0);
      });

      it('rejects a JPEG the decoder only warns about', async () => {
         const jpeg = await sharp({
            create: { width: 16, height: 16, channels: 3, background: '#808080' },
         })
            .jpeg()
            .toBuffer();
         const sof = jpeg.indexOf(Buffer.from([0xff, 0xc0]));
         const damaged = Buffer.concat([
            jpeg.subarray(0, sof),
            Buffer.from([1, 2, 3]),
            jpeg.subarray(sof),
         ]);
         await expect(
            sharp(damaged, { failOn: 'error' }).jpeg().toBuffer(),
         ).resolves.toBeInstanceOf(Buffer);

         await expect(service.uploadOriginalImage(damaged, 'uploads/a')).rejects.toBeInstanceOf(
            InvalidImageError,
         );
         expect(puts).toHaveLength(0);
      });

      it('re-encodes a PNG losslessly without its metadata (EXIF, XMP, text chunks)', async () => {
         const pixels = Buffer.alloc(8 * 8 * 3).map((_, i) => (i * 37) % 256);
         const withExif = await sharp(pixels, { raw: { width: 8, height: 8, channels: 3 } })
            .png()
            .withExif({ IFD0: { Artist: 'Jan Novak', Copyright: 'GPS 50N 14E' } })
            .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"><gps>50N</gps></x:xmpmeta>')
            .toBuffer();
         const afterHeader = 8 + 25;
         const png = Buffer.concat([
            withExif.subarray(0, afterHeader),
            pngChunk('tEXt', Buffer.from('Comment\0taken at home')),
            withExif.subarray(afterHeader),
         ]);
         const before = await sharp(png).metadata();
         expect([before.exif, before.xmp, before.comments]).not.toContain(undefined);

         const result = await service.uploadOriginalImage(png, 'uploads/abc');

         const stored = puts[0];
         expect(stored.Key).toBe('uploads/abc/original.png');
         expect(stored.ContentType).toBe('image/png');
         const after = await sharp(stored.Body).metadata();
         expect(after.exif).toBeUndefined();
         expect(after.xmp).toBeUndefined();
         expect(after.comments).toBeUndefined();
         for (const chunk of ['eXIf', 'tEXt', 'iTXt']) {
            expect(stored.Body.includes(chunk)).toBe(false);
         }
         expect(await sharp(stored.Body).raw().toBuffer()).toEqual(
            await sharp(png).raw().toBuffer(),
         );
         expect(result.size).toBe(stored.Body.byteLength);
      });

      it('keeps the colour profile of a JPEG and drops its EXIF', async () => {
         const jpeg = await sharp({
            create: { width: 8, height: 8, channels: 3, background: '#00ff00' },
         })
            .withIccProfile('p3')
            .withExif({ IFD0: { Artist: 'Jan Novak' } })
            .jpeg()
            .toBuffer();

         await service.uploadOriginalImage(jpeg, 'uploads/abc');

         const meta = await sharp(puts[0].Body).metadata();
         expect(meta.icc).toEqual((await sharp(jpeg).metadata()).icc);
         expect(meta.exif).toBeUndefined();
      });

      it('does not grow a palette PNG much when it re-encodes it', async () => {
         const pixels = Buffer.alloc(400 * 300 * 3).map((_, i) => ((i >> 6) % 4) * 60);
         const png = await sharp(pixels, { raw: { width: 400, height: 300, channels: 3 } })
            .png({ palette: true })
            .toBuffer();

         await service.uploadOriginalImage(png, 'uploads/abc');

         const stored = puts[0].Body;
         expect(stored.byteLength).toBeLessThanOrEqual(png.byteLength * 1.5);
         expect(await sharp(stored).raw().toBuffer()).toEqual(await sharp(png).raw().toBuffer());
      });

      it('keeps the colour profile and the 16 bits of a PNG', async () => {
         const pixels = Buffer.alloc(4 * 4 * 3).map((_, i) => (i * 37) % 256);
         const png = await sharp(pixels, { raw: { width: 4, height: 4, channels: 3 } })
            .toColourspace('rgb16')
            .withIccProfile('p3')
            .png()
            .toBuffer();

         await service.uploadOriginalImage(png, 'uploads/abc');

         const stored = puts[0].Body;
         const meta = await sharp(stored).metadata();
         expect(meta.depth).toBe('ushort');
         expect(meta.icc).toEqual((await sharp(png).metadata()).icc);
         const samples = (image: Buffer) =>
            sharp(image)
               .keepIccProfile()
               .toColourspace('rgb16')
               .raw({ depth: 'ushort' })
               .toBuffer();
         expect(await samples(stored)).toEqual(await samples(png));
      });

      it('stores a WebP and a GIF as they came', async () => {
         const image = sharp({
            create: { width: 4, height: 4, channels: 3, background: '#808080' },
         });
         const webp = await image.clone().webp().toBuffer();
         const gif = await image.clone().gif().toBuffer();

         await service.uploadOriginalImage(webp, 'uploads/a');
         await service.uploadOriginalImage(gif, 'uploads/b');

         expect(puts[0].Body).toBe(webp);
         expect(puts[1].Body).toBe(gif);
         expect(puts[1].ContentType).toBe('image/gif');
      });

      it('rejects an image over the pixel limit before it is decoded', async () => {
         const upload = service.uploadOriginalImage(createPngClaiming(20_000, 20_000), 'uploads/a');

         await expect(upload).rejects.toBeInstanceOf(InvalidImageError);
         await expect(upload).rejects.toThrow('The image is too large');
         expect(puts).toHaveLength(0);
      });
   });

   describe('generateResizedVariants', () => {
      it('applies the EXIF orientation: a portrait photo stays a portrait', async () => {
         const photo = await phonePhoto();

         const variants = await service.generateResizedVariants(photo, 'uploads/abc');

         expect(variants).toHaveLength(3);
         for (const variant of variants) {
            expect(variant.height).toBeGreaterThan(variant.width ?? 0);
         }
         expect(puts.map((put) => put.ContentType)).toEqual([
            'image/webp',
            'image/webp',
            'image/webp',
         ]);
      });

      it('refuses an image over the pixel limit', async () => {
         await expect(
            service.generateResizedVariants(createPngClaiming(20_000, 20_000), 'uploads/a'),
         ).rejects.toThrow();
         expect(puts).toHaveLength(0);
      });
   });

   describe('upload (not an image)', () => {
      const pdf = Buffer.from('%PDF-1.4');

      it('takes the extension and the stored type from the given type, not from the name', async () => {
         const result = await service.upload(pdf, 'application/pdf', 'uploads/abc');

         expect(result.key).toBe('uploads/abc/original.pdf');
         expect(puts[0].ContentType).toBe('application/pdf');
         expect(puts[0].Body).toBe(pdf);
      });

      it('gives an unknown type the neutral extension', async () => {
         const result = await service.upload(pdf, 'application/zip+x', 'uploads/abc');
         expect(result.key).toMatch(/original\.bin$/);
      });
   });
});
