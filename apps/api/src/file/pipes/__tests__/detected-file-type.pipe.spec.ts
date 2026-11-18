import { BadRequestException } from '@nestjs/common';

import { detectFileType } from '../../detect-file-type';
import { DetectedFileTypePipe } from '../detected-file-type.pipe';

jest.mock('../../detect-file-type');
const detect = jest.mocked(detectFileType);

const pipe = new DetectedFileTypePipe();
const file = (mimetype: string) =>
   ({ mimetype, buffer: Buffer.from('bytes'), originalname: 'x' }) as Express.Multer.File;

describe('DetectedFileTypePipe', () => {
   afterEach(() => jest.resetAllMocks());

   it('passes the detected type on, not the claimed one', async () => {
      detect.mockResolvedValue('image/jpeg');

      const result = await pipe.transform(file('application/pdf'));

      expect(result.detectedMimeType).toBe('image/jpeg');
      expect(result.mimetype).toBe('application/pdf');
   });

   it('accepts a ZIP claimed as application/x-zip-compressed', async () => {
      detect.mockResolvedValue('application/zip');

      const result = await pipe.transform(file('application/x-zip-compressed'));

      expect(result.detectedMimeType).toBe('application/zip');
   });

   it('refuses bytes without a detected type', async () => {
      detect.mockResolvedValue(undefined);

      await expect(pipe.transform(file('image/svg+xml'))).rejects.toBeInstanceOf(
         BadRequestException,
      );
   });

   it('refuses a detected type that is not on the allow list', async () => {
      detect.mockResolvedValue('application/x-msdownload');

      await expect(pipe.transform(file('application/pdf'))).rejects.toBeInstanceOf(
         BadRequestException,
      );
   });

   it('refuses a file without bytes without detecting anything', async () => {
      await expect(
         pipe.transform({ mimetype: 'image/png' } as Express.Multer.File),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(detect).not.toHaveBeenCalled();
   });
});
