import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

const SAVE_LABEL_KEY = 'common.save';

type EditorFormActionsProps = {
   isDraft: boolean;
   isSaving: boolean;
   disabled?: boolean;
   canPublish?: boolean;
   readOnly?: boolean;
   formId: string;
   onPublish: () => void;
   onUnpublish: () => void;
   labels: {
      save?: string;
      saveDraft?: string;
      publish?: string;
      unpublish?: string;
   };
   extraActions?: ReactNode;
};

export const EditorFormActions = ({
   isDraft,
   isSaving,
   disabled = false,
   canPublish = true,
   readOnly = false,
   formId,
   onPublish,
   onUnpublish,
   labels,
   extraActions,
}: EditorFormActionsProps) => {
   const { t } = useTranslation();
   const loading = t('common.loading');
   const isLocked = isSaving || disabled;

   if (readOnly) {
      return (
         <div className="flex flex-wrap gap-2">
            {extraActions}
            {!isDraft && canPublish && (
               <Button type="button" variant="outline" disabled={isLocked} onClick={onUnpublish}>
                  {isSaving ? loading : (labels.unpublish ?? t(SAVE_LABEL_KEY))}
               </Button>
            )}
         </div>
      );
   }

   return (
      <div className="flex flex-wrap gap-2">
         {extraActions}
         {isDraft ? (
            <>
               <Button type="submit" form={formId} variant="outline" disabled={isLocked}>
                  {isSaving ? loading : (labels.saveDraft ?? t(SAVE_LABEL_KEY))}
               </Button>
               {canPublish && (
                  <Button type="button" disabled={isLocked} onClick={onPublish}>
                     {isSaving ? loading : (labels.publish ?? t(SAVE_LABEL_KEY))}
                  </Button>
               )}
            </>
         ) : (
            <>
               {canPublish && (
                  <Button type="button" variant="outline" disabled={isLocked} onClick={onUnpublish}>
                     {isSaving ? loading : (labels.unpublish ?? t(SAVE_LABEL_KEY))}
                  </Button>
               )}
               <Button type="submit" form={formId} disabled={isLocked}>
                  {isSaving ? loading : (labels.save ?? t(SAVE_LABEL_KEY))}
               </Button>
            </>
         )}
      </div>
   );
};
