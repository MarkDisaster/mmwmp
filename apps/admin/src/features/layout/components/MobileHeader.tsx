import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import LogoSVG from '@/assets/icons/logo.svg?react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

import { NavLinks } from './NavLinks';
import { UserMenu } from './UserMenu';

export const MobileHeader = () => {
   const { t } = useTranslation();
   const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

   const closeMobileMenu = () => setMobileMenuOpen(false);

   return (
      <>
         <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
            <Link to="/" className="flex items-center">
               <LogoSVG className="h-7 text-primary" />
            </Link>
            <button
               type="button"
               onClick={() => setMobileMenuOpen(true)}
               aria-label={t('nav.openMenu')}
               className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
               <Menu className="h-5 w-5" />
            </button>
         </header>

         <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="flex w-75 flex-col p-0">
               <SheetTitle className="sr-only">Menu</SheetTitle>

               <div className="flex h-14 items-center border-b px-8">
                  <LogoSVG className="h-7 text-primary" />
               </div>

               <NavLinks className="overflow-y-auto px-5" onNavigate={closeMobileMenu} />

               <div className="border-t px-5 py-4">
                  <UserMenu onAction={closeMobileMenu} />
               </div>
            </SheetContent>
         </Sheet>
      </>
   );
};
