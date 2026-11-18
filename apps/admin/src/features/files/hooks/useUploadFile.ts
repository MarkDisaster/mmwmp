import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/endpoints/files';
import type { FileEntity, UpdateFileDtoLanguageEnumKey } from '@/api/generated';
import { api } from '@/utils/axios';

type UseUploadFileOptions = {
   errorMessage?: string;
};

export const useUploadFile = ({ errorMessage }: UseUploadFileOptions = {}) => {
   const queryClient = useQueryClient();

   return useMutation({
      meta: errorMessage ? { errorMessage } : { silent: true },
      mutationFn: async ({
         file,
         displayName,
         language,
         onProgress,
         signal,
      }: {
         file: File;
         displayName?: string;
         language?: UpdateFileDtoLanguageEnumKey;
         onProgress?: (percent: number) => void;
         signal?: AbortSignal;
      }) => {
         const formData = new FormData();
         formData.append('file', file);
         if (displayName) formData.append('displayName', displayName);
         if (language) formData.append('language', language);
         const response = await api.post<FileEntity>('/files', formData, {
            signal,
            onUploadProgress: (event) => {
               if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
            },
         });
         return response.data;
      },
      onSettled: () => {
         queryClient.invalidateQueries({ queryKey: queryKeys.all });
      },
   });
};
