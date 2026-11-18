import { useTranslation } from 'react-i18next';

import type { PermissionDtoActionEnumKey } from '@/api/generated';
import { Checkbox } from '@/components/ui/checkbox';
import {
   isPermissionOffered,
   type PermissionResource,
   RESOURCE_ACTIONS,
} from '@/features/roles/constants';
import {
   hasPermission,
   type PermissionEntry,
   togglePermission,
} from '@/features/roles/utils/permissions';

const ACTIONS = [
   'read',
   'create',
   'update',
   'delete',
   'publish',
] as const satisfies readonly PermissionDtoActionEnumKey[];

type Resource = PermissionResource;

const RESOURCES = Object.keys(RESOURCE_ACTIONS) as Resource[];

type PermissionMatrixProps = {
   value: PermissionEntry[];
   onChange: (permissions: PermissionEntry[]) => void;
   disabled?: boolean;
   canGrant?: (permission: PermissionEntry) => boolean;
};

export const PermissionMatrix = ({
   value,
   onChange,
   disabled,
   canGrant = () => true,
}: PermissionMatrixProps) => {
   const { t } = useTranslation();

   return (
      <div className="overflow-x-auto">
         <table className="w-full text-sm">
            <thead>
               <tr>
                  <th className="w-32 py-2 text-left font-medium">{t('roles.resourceHeader')}</th>
                  {ACTIONS.map((action) => (
                     <th key={action} className="px-4 py-2 text-center font-medium">
                        {t(`roles.action.${action}`)}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody>
               {RESOURCES.map((resource) => (
                  <tr key={resource} className="border-t">
                     <td className="py-3 font-medium">{t(`roles.resource.${resource}`)}</td>
                     {ACTIONS.map((action) => {
                        const isGrantable = canGrant({ resource, action });
                        return (
                           <td key={action} className="px-4 py-3 text-center">
                              {isPermissionOffered(resource, action) && (
                                 <div
                                    className="flex justify-center"
                                    title={isGrantable ? undefined : t('roles.permissionNotHeld')}
                                 >
                                    <Checkbox
                                       id={`${resource}-${action}`}
                                       aria-label={t('roles.permissionLabel', {
                                          resource: t(`roles.resource.${resource}`),
                                          action: t(`roles.action.${action}`),
                                       })}
                                       checked={hasPermission(value, { resource, action })}
                                       onChange={() =>
                                          onChange(togglePermission(value, { resource, action }))
                                       }
                                       disabled={disabled || !isGrantable}
                                    />
                                 </div>
                              )}
                           </td>
                        );
                     })}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
};
