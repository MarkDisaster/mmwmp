import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import type {
   PermissionPair,
   RolePermissionsSummary,
} from '@/features/ai-chat/utils/summarizeRolePermissions';

const describePermission = ({ resource, action }: PermissionPair, t: TFunction): string =>
   t('roles.permissionLabel', {
      resource: t(`roles.resource.${resource}`, { defaultValue: resource }),
      action: t(`roles.action.${action}`, { defaultValue: action }),
   });

const PermissionList = ({ heading, pairs }: { heading: string; pairs: PermissionPair[] }) => {
   const { t } = useTranslation();
   return (
      <>
         <p className="font-semibold">{heading}</p>
         <ul className="list-disc pl-4 text-muted-foreground">
            {pairs.map((pair) => (
               <li key={`${pair.resource}.${pair.action}`} className="break-all">
                  {describePermission(pair, t)}
               </li>
            ))}
         </ul>
      </>
   );
};

const NewPermissionSet = ({ next }: { next: PermissionPair[] }) => {
   const { t } = useTranslation();
   if (next.length === 0)
      return <p className="font-semibold">{t('chat.approval.permissionsNone')}</p>;
   return (
      <PermissionList
         heading={t('chat.approval.permissionsFullSet', { count: next.length })}
         pairs={next}
      />
   );
};

const PermissionDiff = ({ diff }: { diff: NonNullable<RolePermissionsSummary['diff']> }) => {
   const { t } = useTranslation();
   if (diff.grant.length === 0 && diff.revoke.length === 0) {
      return <p className="text-muted-foreground">{t('chat.approval.permissionsUnchanged')}</p>;
   }
   return (
      <>
         {diff.grant.length > 0 && (
            <PermissionList
               heading={t('chat.approval.permissionsGrant', { count: diff.grant.length })}
               pairs={diff.grant}
            />
         )}
         {diff.revoke.length > 0 && (
            <PermissionList
               heading={t('chat.approval.permissionsRevoke', { count: diff.revoke.length })}
               pairs={diff.revoke}
            />
         )}
      </>
   );
};

export const RolePermissionsLines = ({ summary }: { summary: RolePermissionsSummary }) => {
   const { t } = useTranslation();
   const { roleId, roleName, diff, next } = summary;
   return (
      <div className="text-[12px]">
         <p className="font-semibold">
            {roleName === null
               ? t('chat.approval.roleTarget', { id: roleId })
               : t('chat.approval.roleLabel', { name: roleName, id: roleId })}
         </p>
         {diff === null ? <NewPermissionSet next={next} /> : <PermissionDiff diff={diff} />}
      </div>
   );
};
