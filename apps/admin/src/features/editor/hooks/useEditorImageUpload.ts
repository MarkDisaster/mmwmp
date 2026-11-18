import type { Transaction } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { imageContentFromFile, insertImageContent } from '@/features/editor/utils/imageContent';
import { useUploadFile } from '@/features/files/hooks/useUploadFile';
import { getFileError, getFileErrorMessage } from '@/features/files/utils/fileValidation';

export const IMAGE_ACCEPT = ['image/'];

export const useEditorImageUpload = (editor: Editor | null) => {
   const { t } = useTranslation();
   const uploadFile = useUploadFile();

   return (file: File, at?: number) => {
      const error = getFileError(file, IMAGE_ACCEPT);
      if (error) {
         const { title, detail } = getFileErrorMessage(t, error, 'image');
         toast.error(title, { description: detail });
         return;
      }
      const toastId = toast.loading(t('files.uploadDialog.uploading'));
      let pos = at;
      const onTransaction = ({ transaction }: { transaction: Transaction }) => {
         if (pos !== undefined) pos = transaction.mapping.map(pos);
      };
      if (at !== undefined) editor?.on('transaction', onTransaction);
      const stopTracking = () => editor?.off('transaction', onTransaction);
      void uploadFile.mutateAsync({ file }).then(
         (uploaded) => {
            stopTracking();
            toast.dismiss(toastId);
            const content = imageContentFromFile(uploaded);
            if (editor) insertImageContent(editor, content, pos);
         },
         () => {
            stopTracking();
            toast.error(t('files.toast.error'), { id: toastId });
         },
      );
   };
};
