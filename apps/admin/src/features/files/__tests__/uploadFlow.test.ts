import { AxiosError, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { createUploadFlowState, isRefusedFileType, uploadFlowReducer } from '../utils/uploadFlow';

const pdf = new File(['x'], 'report.pdf', { type: 'application/pdf' });
const image = new File(['x'], 'photo.png', { type: 'image/png' });

describe('createUploadFlowState', () => {
   it('should start with the details of a file chosen beforehand', () => {
      expect(createUploadFlowState(pdf)).toEqual({
         file: pdf,
         displayName: 'report',
         language: null,
         fileError: null,
         uploadFailed: false,
         progress: 0,
      });
   });

   it('should start at picking a file without one', () => {
      expect(createUploadFlowState(null)).toMatchObject({ file: null, displayName: '' });
   });
});

describe('uploadFlowReducer', () => {
   it('should take a picked file with its name and clear an earlier refusal', () => {
      const refused = { ...createUploadFlowState(null), fileError: 'tooLarge' as const };

      expect(uploadFlowReducer(refused, { type: 'pick', file: image, error: null })).toEqual(
         createUploadFlowState(image),
      );
   });

   it('should keep picking with the reason when the file is refused', () => {
      const state = uploadFlowReducer(createUploadFlowState(null), {
         type: 'pick',
         file: image,
         error: 'invalidType',
      });

      expect(state).toMatchObject({ file: null, fileError: 'invalidType' });
   });

   it('should edit the details', () => {
      let state = uploadFlowReducer(createUploadFlowState(pdf), {
         type: 'setDisplayName',
         value: 'CV',
      });
      state = uploadFlowReducer(state, { type: 'setLanguage', value: 'en' });

      expect(state).toMatchObject({ displayName: 'CV', language: 'en' });
      expect(uploadFlowReducer(state, { type: 'setLanguage', value: null }).language).toBeNull();
   });

   it('should clear a failure and the progress when an upload starts', () => {
      const failed = { ...createUploadFlowState(pdf), uploadFailed: true, progress: 60 };

      expect(uploadFlowReducer(failed, { type: 'start' })).toMatchObject({
         uploadFailed: false,
         progress: 0,
      });
   });

   it('should track the progress and a failure of the upload', () => {
      const started = uploadFlowReducer(createUploadFlowState(pdf), { type: 'start' });
      const halfway = uploadFlowReducer(started, { type: 'progress', percent: 50 });

      expect(halfway.progress).toBe(50);
      expect(uploadFlowReducer(halfway, { type: 'fail' })).toMatchObject({
         uploadFailed: true,
         file: pdf,
      });
   });

   it('should go back to picking a file with the reason when the API refuses it', () => {
      const started = uploadFlowReducer(createUploadFlowState(pdf), { type: 'start' });

      expect(uploadFlowReducer(started, { type: 'refuse', error: 'invalidType' })).toEqual({
         ...createUploadFlowState(null),
         fileError: 'invalidType',
      });
   });

   it('should go back to picking a file on reset', () => {
      const edited = { ...createUploadFlowState(pdf), language: 'cs' as const, uploadFailed: true };

      expect(uploadFlowReducer(edited, { type: 'reset' })).toEqual(createUploadFlowState(null));
   });
});

describe('isRefusedFileType', () => {
   const failed = (status: number, data: unknown) =>
      new AxiosError('failed', undefined, undefined, undefined, {
         status,
         data,
      } as AxiosResponse);

   it('should take a 400 with a message as a file type the API does not allow', () => {
      expect(
         isRefusedFileType(
            failed(400, {
               statusCode: 400,
               message: 'Validation failed (file type is not allowed)',
            }),
         ),
      ).toBe(true);
   });

   it('should not take a 400 of the form fields as a refused file', () => {
      expect(
         isRefusedFileType(
            failed(400, {
               statusCode: 400,
               message: ['displayName must be shorter than or equal to 255 characters'],
               error: 'Bad Request',
            }),
         ),
      ).toBe(false);
   });

   it('should not take another failure as a refused file', () => {
      expect(isRefusedFileType(failed(500, { message: 'Internal server error' }))).toBe(false);
      expect(isRefusedFileType(new Error('failed'))).toBe(false);
   });
});
