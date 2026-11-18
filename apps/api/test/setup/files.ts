import sharp from 'sharp';
import { crc32, deflateSync } from 'zlib';

export const createTestJpeg = () =>
   sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
      .jpeg()
      .toBuffer();

export const createTestZip = (entries: Record<string, string>) =>
   Buffer.concat(
      Object.entries(entries).flatMap(([name, content]) => {
         const nameBytes = Buffer.from(name);
         const data = Buffer.from(content);
         const header = Buffer.alloc(30);
         header.writeUInt32LE(0x04034b50, 0);
         header.writeUInt16LE(20, 4);
         header.writeUInt32LE(crc32(data), 14);
         header.writeUInt32LE(data.length, 18);
         header.writeUInt32LE(data.length, 22);
         header.writeUInt16LE(nameBytes.length, 26);
         return [header, nameBytes, data];
      }),
   );

export const createTestDocx = () =>
   createTestZip({
      '[Content_Types].xml':
         '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
   });

export const pngChunk = (type: string, data: Buffer) => {
   const body = Buffer.concat([Buffer.from(type), data]);
   const length = Buffer.alloc(4);
   length.writeUInt32BE(data.length);
   const crc = Buffer.alloc(4);
   crc.writeUInt32BE(crc32(body));
   return Buffer.concat([length, body, crc]);
};

export const createPngClaiming = (width: number, height: number) => {
   const ihdr = Buffer.alloc(13);
   ihdr.writeUInt32BE(width, 0);
   ihdr.writeUInt32BE(height, 4);
   ihdr.set([8, 0, 0, 0, 0], 8);
   return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      pngChunk('IHDR', ihdr),
      pngChunk('IDAT', deflateSync(Buffer.alloc(1))),
      pngChunk('IEND', Buffer.alloc(0)),
   ]);
};
