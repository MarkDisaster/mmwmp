import { cn } from '@mm/utils/cn';
import { Link } from '@tanstack/react-router';
import { Check, ChevronUp, Globe, LogOut, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import CzFlagSVG from '@/assets/flags/cz.svg?react';
import EnFlagSVG from '@/assets/flags/en.svg?react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuSub,
   DropdownMenuSubContent,
   DropdownMenuSubTrigger,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { toLanguageCode } from '@/utils/language';
import { getUserDisplayName, getUserInitials } from '@/utils/user';

const LANGUAGES = [
   { code: 'cs', label: 'Čeština', Flag: CzFlagSVG },
   { code: 'en', label: 'English', Flag: EnFlagSVG },
] as const;

type UserAvatarProps = {
   className: string;
   avatarUrl: string | null | undefined;
   initials: string;
};

const UserAvatar = ({ className, avatarUrl, initials }: UserAvatarProps) => (
   <Avatar className={className}>
      <AvatarImage src={avatarUrl ?? undefined} />
      <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
         {initials}
      </AvatarFallback>
   </Avatar>
);

type Props = {
   onAction?: () => void;
};

export const UserMenu = ({ onAction }: Props) => {
   const { t, i18n } = useTranslation();
   const { user, logout } = useAuth();
   const [profileOpen, setProfileOpen] = useState(false);

   const baseLang = toLanguageCode(i18n.language);
   const { fullName, displayName } = getUserDisplayName(
      user?.firstName,
      user?.lastName,
      user?.email,
   );
   const initials = getUserInitials(user?.firstName, user?.lastName, user?.email);

   const handleLogout = () => {
      onAction?.();
      logout();
   };

   return (
      <DropdownMenu open={profileOpen} onOpenChange={setProfileOpen}>
         <DropdownMenuTrigger asChild>
            <button
               type="button"
               className={cn(
                  'flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-300 hover:bg-card hover:shadow-sm',
                  profileOpen && 'bg-card shadow-sm',
               )}
            >
               <UserAvatar className="h-9 w-9" avatarUrl={user?.avatarUrl} initials={initials} />
               <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  {fullName && (
                     <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                  )}
               </div>
               <ChevronUp
                  className={cn(
                     'h-4 w-4 text-muted-foreground transition-transform duration-200',
                     profileOpen && 'rotate-180',
                  )}
               />
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent side="top" align="start" className="w-[16rem]">
            <div className="flex items-center gap-2 p-2">
               <UserAvatar className="h-8 w-8" avatarUrl={user?.avatarUrl} initials={initials} />
               <div className="text-sm">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
               </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
               <Link to="/profile" onClick={onAction}>
                  <User className="mr-2 h-4 w-4" />
                  {t('auth.profile')}
               </Link>
            </DropdownMenuItem>
            <DropdownMenuSub>
               <DropdownMenuSubTrigger>
                  <Globe className="mr-2 h-4 w-4" />
                  {t('nav.language')}
               </DropdownMenuSubTrigger>
               <DropdownMenuSubContent>
                  {LANGUAGES.map(({ code, label, Flag }) => (
                     <DropdownMenuItem
                        key={code}
                        onClick={() => {
                           void i18n.changeLanguage(code);
                           onAction?.();
                        }}
                     >
                        <span className="mr-2 h-4 w-4 overflow-hidden rounded-full">
                           <Flag className="h-full w-full scale-150" />
                        </span>
                        {label}
                        {baseLang === code && <Check className="ml-auto h-4 w-4 text-primary" />}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
               onClick={handleLogout}
               className="text-destructive hover:text-destructive focus:text-destructive hover:[&_svg:not([class*='text-'])]:text-destructive focus:[&_svg:not([class*='text-'])]:text-destructive"
            >
               <LogOut className="mr-2 h-4 w-4" />
               {t('auth.logout')}
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
};
