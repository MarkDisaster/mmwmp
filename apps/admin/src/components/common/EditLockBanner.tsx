import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { EditLockEntity } from '@/api/generated';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { useRecordLock } from '@/hooks/useRecordLock';

type EditLockBannerProps = {
   entity: EditLockEntity;
   id: number;
   readOnly?: boolean;
};

const ActiveEditLockBanner = ({ entity, id }: Omit<EditLockBannerProps, 'readOnly'>) => {
   const { t, i18n } = useTranslation();
   const { heldBy, takenOver, takeOver } = useRecordLock(entity, id);

   const message = heldBy
      ? t(takenOver ? 'common.editLock.takenOver' : 'common.editLock.heldBy', {
           name: heldBy.name,
           time: new Date(heldBy.since).toLocaleTimeString(i18n.language, {
              hour: '2-digit',
              minute: '2-digit',
           }),
        })
      : '';

   return (
      <>
         <div aria-live="polite" className="sr-only">
            {message}
         </div>
         {heldBy && (
            <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
               <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
               <p className="flex-1 text-sm">{message}</p>
               <Button type="button" variant="outline" size="sm" onClick={takeOver}>
                  {t('common.editLock.takeOver')}
               </Button>
            </div>
         )}
      </>
   );
};

export const EditLockBanner = ({ entity, id, readOnly }: EditLockBannerProps) => {
   const canUpdate = usePermission(entity, 'update');

   return canUpdate && !readOnly ? (
      <ActiveEditLockBanner key={`${entity}:${id}`} entity={entity} id={id} />
   ) : null;
};
