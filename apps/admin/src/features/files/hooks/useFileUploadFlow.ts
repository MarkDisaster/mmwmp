import { isCancel } from 'axios';
import { useEffect, useReducer, useRef } from 'react';

import type { FileEntity, UpdateFileDtoLanguageEnumKey } from '@/api/generated';
import { useUploadFile } from '@/features/files/hooks/useUploadFile';
import { getFileError } from '@/features/files/utils/fileValidation';
import {
   createUploadFlowState,
   isRefusedFileType,
   uploadFlowReducer,
} from '@/features/files/utils/uploadFlow';

type UseFileUploadFlowOptions = {
   initialFile: File | null;
   accept?: string[];
   onUploaded: (file: FileEntity) => void;
};

export const useFileUploadFlow = ({
   initialFile,
   accept,
   onUploaded,
}: UseFileUploadFlowOptions) => {
   const uploadFile = useUploadFile();
   const [state, dispatch] = useReducer(uploadFlowReducer, initialFile, createUploadFlowState);
   const abortRef = useRef<AbortController | null>(null);

   useEffect(() => () => abortRef.current?.abort(), []);

   const pick = (file: File) => dispatch({ type: 'pick', file, error: getFileError(file, accept) });

   const upload = () => {
      if (!state.file) return;
      const controller = new AbortController();
      abortRef.current = controller;
      dispatch({ type: 'start' });
      uploadFile.mutate(
         {
            file: state.file,
            displayName: state.displayName || undefined,
            language: state.language ?? undefined,
            onProgress: (percent) => dispatch({ type: 'progress', percent }),
            signal: controller.signal,
         },
         {
            onSuccess: (uploaded) => {
               dispatch({ type: 'reset' });
               onUploaded(uploaded);
            },
            onError: (error) => {
               if (isCancel(error)) return;
               if (isRefusedFileType(error)) {
                  dispatch({ type: 'refuse', error: 'invalidType' });
               } else {
                  dispatch({ type: 'fail' });
               }
            },
            onSettled: () => {
               if (abortRef.current === controller) abortRef.current = null;
            },
         },
      );
   };

   return {
      ...state,
      isPending: uploadFile.isPending,
      pick,
      setDisplayName: (value: string) => dispatch({ type: 'setDisplayName', value }),
      setLanguage: (value: UpdateFileDtoLanguageEnumKey | null) =>
         dispatch({ type: 'setLanguage', value }),
      upload,
      abort: () => abortRef.current?.abort(),
      reset: () => dispatch({ type: 'reset' }),
   };
};
