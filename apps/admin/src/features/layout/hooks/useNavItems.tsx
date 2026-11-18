import {
   BookUser,
   Briefcase,
   ClipboardList,
   FileImage,
   FolderOpen,
   Gamepad2,
   LayoutDashboard,
   Shield,
   Tags,
   Trash2,
   Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hooks/useAuth';
import { canAccessRoute, isGuardedRoute } from '@/utils/routePermissions';

export type NavItem = {
   to: string;
   label: string;
   icon: ReactNode;
};

export const useNavItems = (): NavItem[] => {
   const { t } = useTranslation();
   const { user } = useAuth();

   const items: NavItem[] = [
      { to: '/', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-5 w-5" /> },
      { to: '/projects', label: t('nav.projects'), icon: <FolderOpen className="h-5 w-5" /> },
      { to: '/services', label: t('nav.services'), icon: <Briefcase className="h-5 w-5" /> },
      { to: '/tags', label: t('nav.tags'), icon: <Tags className="h-5 w-5" /> },
      { to: '/users', label: t('nav.users'), icon: <Users className="h-5 w-5" /> },
      { to: '/roles', label: t('nav.roles'), icon: <Shield className="h-5 w-5" /> },
      { to: '/files', label: t('nav.files'), icon: <FileImage className="h-5 w-5" /> },
      { to: '/trash', label: t('nav.trash'), icon: <Trash2 className="h-5 w-5" /> },
      { to: '/contact', label: t('nav.contact'), icon: <BookUser className="h-5 w-5" /> },
      { to: '/audit', label: t('nav.auditLog'), icon: <ClipboardList className="h-5 w-5" /> },
      {
         to: '/runner-scores',
         label: t('nav.runnerScores'),
         icon: <Gamepad2 className="h-5 w-5" />,
      },
   ];

   return items.filter((item) =>
      user ? canAccessRoute(user.role, item.to) : !isGuardedRoute(item.to),
   );
};
