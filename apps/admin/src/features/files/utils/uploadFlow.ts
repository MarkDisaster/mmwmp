import { isAxiosError } from 'axios';

import type { UpdateFileDtoLanguageEnumKey } from '@/api/generated';
import type { FileError } from '@/features/files/utils/fileValidation';
import { getNameWithoutExtension } from '@/utils/file';

export type UploadFlowState = {
   file: File | null;
   displayName: string;
   language: UpdateFileDtoLanguageEnumKey | null;
   fileError: FileError | null;
   uploadFailed: boolean;
   progress: number;
};

export type UploadFlowAction =
   | { type: 'pick'; file: File; error: FileError | null }
   | { type: 'setDisplayName'; value: string }
   | { type: 'setLanguage'; value: UpdateFileDtoLanguageEnumKey | null }
   | { type: 'start' }
   | { type: 'progress'; percent: number }
   | { type: 'fail' }
   | { type: 'refuse'; error: FileError }
   | { type: 'reset' };

export const createUploadFlowState = (file: File | null): UploadFlowState => ({
   file,
   displayName: file ? getNameWithoutExtension(file.name) : '',
   language: null,
   fileError: null,
   uploadFailed: false,
   progress: 0,
});

export const uploadFlowReducer = (
   state: UploadFlowState,
   action: UploadFlowAction,
): UploadFlowState => {
   switch (action.type) {
      case 'pick':
         return action.error
            ? { ...state, fileError: action.error }
            : createUploadFlowState(action.file);
      case 'setDisplayName':
         return { ...state, displayName: action.value };
      case 'setLanguage':
         return { ...state, language: action.value };
      case 'start':
         return { ...state, uploadFailed: false, progress: 0 };
      case 'progress':
         return { ...state, progress: action.percent };
      case 'fail':
         return { ...state, uploadFailed: true };
      case 'refuse':
         return { ...createUploadFlowState(null), fileError: action.error };
      case 'reset':
         return createUploadFlowState(null);
   }
};

export const isRefusedFileType = (error: unknown): boolean =>
   isAxiosError<{ message?: unknown } | null>(error) &&
   error.response?.status === 400 &&
   !Array.isArray(error.response.data?.message);
