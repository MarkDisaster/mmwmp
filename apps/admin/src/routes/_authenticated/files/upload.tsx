import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { FileUploadDialog } from '@/features/files/components/FileUploadDialog';
import { requireRoutePermission } from '@/utils/routePermissions';

export const Route = createFileRoute('/_authenticated/files/upload')({
   beforeLoad: requireRoutePermission('/files/upload'),
   component: FilesUploadRoute,
});

function FilesUploadRoute() {
   const navigate = useNavigate();

   return (
      <FileUploadDialog
         open
         onOpenChange={(open) => !open && navigate({ to: '/files', search: true })}
      />
   );
}
