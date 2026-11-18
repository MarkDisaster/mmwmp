import LogoSVG from '@/assets/icons/logo.svg?react';

import { NavLinks } from './NavLinks';
import { UserMenu } from './UserMenu';

export const Sidebar = () => (
   <aside className="hidden h-full w-60 min-w-60 flex-col bg-background py-4 pr-4 pl-5 md:flex">
      <div className="flex h-14 items-center px-3">
         <LogoSVG className="h-8 text-primary" />
      </div>

      <NavLinks />
      <UserMenu />
   </aside>
);
