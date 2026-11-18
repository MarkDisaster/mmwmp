import { useMutation, useQuery } from '@tanstack/react-query';
import { getRouteApi } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { api } from '@/api';
import type { UserControllerFindAllQueryParamsStatusEnumKey, UserEntity } from '@/api/generated';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DeleteDialog } from '@/components/common/DeleteDialog';
import { NoRecords } from '@/components/common/NoRecords';
import { NoResults } from '@/components/common/NoResults';
import { PageHeader } from '@/components/common/PageHeader';
import { QueryErrorState } from '@/components/common/QueryErrorState';
import { SearchInput } from '@/components/common/SearchInput';
import { SkeletonListPage } from '@/components/common/SkeletonListPage';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import { useAssignableRoleOptions } from '@/features/users/hooks/useAssignableRoleOptions';
import { useAuth } from '@/hooks/useAuth';
import { useListPageClamp } from '@/hooks/useListPageClamp';
import { useListSearch } from '@/hooks/useListSearch';
import { usePermission } from '@/hooks/usePermission';

import { UserCreateDialog } from './UserCreateDialog';
import { UserEditDialog } from './UserEditDialog';
import { UserInviteDialog } from './UserInviteDialog';
import { UserTable } from './UserTable';

const routeApi = getRouteApi('/_authenticated/users/');

export const UserListPage = () => {
   const { t } = useTranslation();
   const { user } = useAuth();
   const cancelLabel = t('common.cancel');
   const navigate = routeApi.useNavigate();
   const listSearch = routeApi.useSearch();
   const list = useListSearch(listSearch, (search, options) => navigate({ search, ...options }));
   const [deleteId, setDeleteId] = useState<number | null>(null);
   const [deactivateTarget, setDeactivateTarget] = useState<UserEntity | null>(null);
   const [reactivateTarget, setReactivateTarget] = useState<UserEntity | null>(null);

   const { data, isLoading, isPlaceholderData, isLoadingError, isFetching, refetch } = useQuery(
      api.users.queries.all({ ...list.listParams, status: listSearch.status }),
   );
   useListPageClamp(list, isPlaceholderData ? undefined : data?.totalCount);
   const roleOptions = useAssignableRoleOptions();
   const deleteUser = useMutation(api.users.mutations.remove);
   const deactivateUser = useMutation(api.users.mutations.deactivate);
   const reactivateUser = useMutation(api.users.mutations.reactivate);
   const resendInvitation = useMutation(api.users.mutations.resendInvitation);
   const changeRole = useMutation(api.users.mutations.updateRole);
   const canCreate = usePermission('users', 'create');
   const canUpdate = usePermission('users', 'update');
   const canDelete = usePermission('users', 'delete');
   const [editTarget, setEditTarget] = useState<UserEntity | null>(null);
   const [showCreate, setShowCreate] = useState(false);
   const [showInvite, setShowInvite] = useState(false);
   const [changeRoleTarget, setChangeRoleTarget] = useState<UserEntity | null>(null);
   const [selectedRoleId, setSelectedRoleId] = useState<string>('');

   const handleOpenChangeRole = useCallback((target: UserEntity) => {
      setChangeRoleTarget(target);
      setSelectedRoleId(String(target.role.id));
   }, []);

   const { mutate: resend } = resendInvitation;
   const handleResend = useCallback(
      (id: number) =>
         resend(
            { id },
            {
               onSuccess: () => toast.success(t('users.toast.invitationResent')),
            },
         ),
      [resend, t],
   );

   const handleCloseChangeRole = () => {
      setChangeRoleTarget(null);
      setSelectedRoleId('');
   };

   const handleConfirmChangeRole = () => {
      if (!changeRoleTarget || !selectedRoleId) return;
      changeRole.mutate(
         { id: changeRoleTarget.id, data: { roleId: Number(selectedRoleId) } },
         {
            onSuccess: () => {
               toast.success(t('users.toast.roleChanged'));
               handleCloseChangeRole();
            },
         },
      );
   };

   const confirmDeactivate = () => {
      if (!deactivateTarget) return;
      deactivateUser.mutate(
         { id: deactivateTarget.id },
         {
            onSuccess: () => {
               setDeactivateTarget(null);
               toast.success(t('users.toast.deactivated'));
            },
            onError: () => setDeactivateTarget(null),
         },
      );
   };

   const confirmReactivate = () => {
      if (!reactivateTarget) return;
      reactivateUser.mutate(
         { id: reactivateTarget.id },
         {
            onSuccess: () => {
               setReactivateTarget(null);
               toast.success(t('users.toast.reactivated'));
            },
            onError: () => setReactivateTarget(null),
         },
      );
   };

   const confirmDelete = () => {
      if (deleteId) {
         deleteUser.mutate(
            { id: deleteId },
            {
               onSuccess: () => {
                  setDeleteId(null);
                  toast.success(t('users.toast.deleted'));
               },
            },
         );
      }
   };

   if (isLoading) {
      return <SkeletonListPage cols={7} rowContent="actions" actions={['w-64', 'w-44', 'w-41']} />;
   }

   return (
      <div className="space-y-4">
         <PageHeader
            title={t('users.title')}
            actions={
               <div className="flex flex-wrap items-center gap-3">
                  <SearchInput value={list.searchValue} onChange={list.onSearchChange} />
                  {canCreate && (
                     <>
                        <Button onClick={() => setShowCreate(true)}>
                           <Plus className="mr-2 h-4 w-4" />
                           {t('users.createBtn')}
                        </Button>
                        <Button variant="outline" onClick={() => setShowInvite(true)}>
                           <Plus className="mr-2 h-4 w-4" />
                           {t('users.invite')}
                        </Button>
                     </>
                  )}
               </div>
            }
         />

         <div className="flex items-center gap-2">
            <Select
               value={listSearch.status ?? 'all'}
               onValueChange={(value) =>
                  list.setFilters({
                     status:
                        value === 'all'
                           ? undefined
                           : (value as UserControllerFindAllQueryParamsStatusEnumKey),
                  })
               }
            >
               <SelectTrigger className="w-45" aria-label={t('users.table.status')}>
                  <SelectValue />
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="all">{t('users.filter.all')}</SelectItem>
                  <SelectItem value="active">{t('users.filter.active')}</SelectItem>
                  <SelectItem value="deactivated">{t('users.filter.deactivated')}</SelectItem>
               </SelectContent>
            </Select>
         </div>

         {isLoadingError ? (
            <QueryErrorState onRetry={() => void refetch()} isRetrying={isFetching} />
         ) : (
            <UserTable
               data={data?.data ?? []}
               totalCount={data?.totalCount ?? 0}
               pagination={list.pagination}
               onPaginationChange={list.onPaginationChange}
               sorting={list.sorting}
               onSortingChange={list.onSortingChange}
               actor={user}
               {...(canUpdate && {
                  onEdit: setEditTarget,
                  onResend: handleResend,
                  onChangeRole: handleOpenChangeRole,
                  onDeactivate: setDeactivateTarget,
                  onReactivate: setReactivateTarget,
               })}
               onDelete={canDelete ? setDeleteId : undefined}
               isFetching={isPlaceholderData}
               emptyState={
                  list.isFiltered ? (
                     <NoResults />
                  ) : (
                     <NoRecords
                        action={
                           canCreate
                              ? { label: t('users.createBtn'), onClick: () => setShowCreate(true) }
                              : undefined
                        }
                     />
                  )
               }
            />
         )}

         <DeleteDialog
            open={deleteId !== null}
            onOpenChange={(open) => !open && setDeleteId(null)}
            onConfirm={confirmDelete}
            isPending={deleteUser.isPending}
            title={t('users.delete.title')}
            description={t('users.delete.description')}
            confirmLabel={t('users.delete.confirm')}
            cancelLabel={t('users.delete.cancel')}
         />

         <ConfirmDialog
            open={deactivateTarget !== null}
            onOpenChange={(open) => !open && setDeactivateTarget(null)}
            onConfirm={confirmDeactivate}
            isPending={deactivateUser.isPending}
            title={t('users.deactivate.title')}
            description={t('users.deactivate.description', { email: deactivateTarget?.email })}
            confirmLabel={t('users.deactivate.confirm')}
            cancelLabel={cancelLabel}
         />

         <ConfirmDialog
            open={reactivateTarget !== null}
            onOpenChange={(open) => !open && setReactivateTarget(null)}
            onConfirm={confirmReactivate}
            isPending={reactivateUser.isPending}
            title={t('users.reactivate.title')}
            description={t('users.reactivate.description', { email: reactivateTarget?.email })}
            confirmLabel={t('users.reactivate.confirm')}
            cancelLabel={cancelLabel}
         />

         <UserCreateDialog open={showCreate} onClose={() => setShowCreate(false)} />
         <UserEditDialog user={editTarget} onClose={() => setEditTarget(null)} />
         <UserInviteDialog open={showInvite} onClose={() => setShowInvite(false)} />

         <Dialog
            open={changeRoleTarget !== null}
            onOpenChange={(open) => !open && handleCloseChangeRole()}
         >
            <DialogContent className="sm:max-w-90">
               <DialogHeader>
                  <DialogTitle>{t('users.actions.changeRole')}</DialogTitle>
               </DialogHeader>
               <div className="space-y-2 py-2">
                  <Label htmlFor="change-role-select">{t('users.form.role')}</Label>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                     <SelectTrigger id="change-role-select">
                        <SelectValue placeholder={t('users.form.selectRole')} />
                     </SelectTrigger>
                     <SelectContent>
                        {roleOptions.map((option) => (
                           <SelectItem key={option.value} value={option.value}>
                              {option.label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <DialogFooter>
                  <Button variant="outline" onClick={handleCloseChangeRole}>
                     {cancelLabel}
                  </Button>
                  <Button
                     onClick={handleConfirmChangeRole}
                     disabled={changeRole.isPending || !selectedRoleId}
                  >
                     {changeRole.isPending ? t('common.loading') : t('common.save')}
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
};
