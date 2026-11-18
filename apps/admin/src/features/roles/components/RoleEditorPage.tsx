import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { RoleEntity } from '@/api/generated';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { EditorFormLayout } from '@/components/common/EditorFormLayout';
import { FormSection } from '@/components/common/FormSection';
import { PageHeader } from '@/components/common/PageHeader';
import { ReadOnlyNotice } from '@/components/common/ReadOnlyNotice';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/features/form/components/FormInput';
import { type PermissionEntry, toPermissionEntries } from '@/features/roles/utils/permissions';
import { type RoleFormValues, roleSchema } from '@/features/roles/validation/roleSchema';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { canManageRole, roleHasPermission } from '@/utils/permission';

import { PermissionMatrix } from './PermissionMatrix';

const ERROR_TOAST_KEY = 'common.error';

type RoleEditorPageProps = {
   role?: RoleEntity;
};

export const RoleEditorPage = ({ role }: RoleEditorPageProps) => {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const isEdit = !!role;
   const actorRole = useAuth().user?.role;
   const canUpdate = usePermission('roles', 'update');
   const canDelete = usePermission('roles', 'delete');
   const isManageable = !role || (!!actorRole && canManageRole(role, actorRole));
   const readOnly = !actorRole || (isEdit && (!canUpdate || !isManageable));
   const showNotice = readOnly && !!actorRole && isEdit && !role.isAdmin;
   const notice = showNotice && (
      <ReadOnlyNotice
         message={t(canUpdate ? 'roles.readOnly.notManageable' : 'common.readOnly.permission')}
      />
   );

   const createRole = useMutation(api.roles.mutations.create);
   const updateRole = useMutation(api.roles.mutations.update);
   const deleteRole = useMutation(api.roles.mutations.remove);
   const setPermissions = useMutation(api.roles.mutations.setPermissions);

   const [permissions, setPermissionsState] = useState<PermissionEntry[]>(() =>
      toPermissionEntries(role?.permissions ?? []),
   );
   const [isDeleteOpen, setIsDeleteOpen] = useState(false);

   const methods = useForm<RoleFormValues>({
      resolver: zodResolver(roleSchema),
      defaultValues: { name: role?.name ?? '' },
   });

   const isSaving = createRole.isPending || updateRole.isPending || setPermissions.isPending;

   const savePermissions = (id: number) =>
      setPermissions.mutateAsync({ id, data: { permissions } });

   const finishSave = () => {
      toast.success(t('roles.toast.saved'));
      void navigate({ to: '/roles' });
   };

   const createWithPermissions = async (data: RoleFormValues) => {
      const created = await createRole.mutateAsync({ data: { name: data.name } }).catch(() => null);
      if (!created) {
         toast.error(t(ERROR_TOAST_KEY));
         return;
      }

      try {
         await savePermissions(created.id);
      } catch {
         toast.error(t('roles.toast.permissionsNotSaved'));
         void navigate({ to: '/roles/$roleId', params: { roleId: created.id }, replace: true });
         return;
      }

      finishSave();
   };

   const updateWithPermissions = async (current: RoleEntity, data: RoleFormValues) => {
      try {
         if (!current.isSystem) {
            await updateRole.mutateAsync({ id: current.id, data: { name: data.name } });
         }
         if (!current.isAdmin) await savePermissions(current.id);
      } catch {
         toast.error(t(ERROR_TOAST_KEY));
         return;
      }

      finishSave();
   };

   const handleSave = (data: RoleFormValues) =>
      role ? updateWithPermissions(role, data) : createWithPermissions(data);

   const handleDelete = () => {
      if (!role) return;
      deleteRole.mutate(
         { id: role.id },
         {
            onSuccess: () => {
               toast.success(t('roles.toast.deleted'));
               void navigate({ to: '/roles' });
            },
            onSettled: () => setIsDeleteOpen(false),
         },
      );
   };

   return (
      <FormProvider {...methods}>
         <EditorFormLayout
            formId="role-form"
            onSubmit={methods.handleSubmit(handleSave)}
            disabled={readOnly}
            notice={notice}
            header={
               <PageHeader
                  title={isEdit ? t('roles.edit') : t('roles.create')}
                  actions={
                     !readOnly && (
                        <Button type="submit" form="role-form" disabled={isSaving}>
                           {isSaving ? t('common.loading') : t('common.save')}
                        </Button>
                     )
                  }
               />
            }
         >
            <FormSection title={t('roles.form.sections.details')}>
               <FormInput
                  name="name"
                  label={t('roles.form.name')}
                  formItemClassName="max-w-sm"
                  disabled={role?.isSystem}
                  placeholder="content-editor"
               />
            </FormSection>

            <FormSection title={t('roles.form.permissions')}>
               {role?.isAdmin ? (
                  <p className="text-sm text-muted-foreground">{t('roles.adminFullAccess')}</p>
               ) : (
                  <PermissionMatrix
                     value={permissions}
                     onChange={setPermissionsState}
                     disabled={readOnly}
                     canGrant={(permission) =>
                        !!actorRole && roleHasPermission(actorRole, permission)
                     }
                  />
               )}
            </FormSection>

            {isEdit && !role.isSystem && canDelete && !readOnly && (
               <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={deleteRole.isPending}
               >
                  {t('roles.delete.title')}
               </Button>
            )}
         </EditorFormLayout>

         <DeleteDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onConfirm={handleDelete}
            isPending={deleteRole.isPending}
            title={t('roles.delete.title')}
            description={t('roles.delete.description')}
            confirmLabel={t('roles.delete.confirm')}
            cancelLabel={t('roles.delete.cancel')}
         />
      </FormProvider>
   );
};
