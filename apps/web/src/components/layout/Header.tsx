'use client';

import { cn } from '@mm/utils/cn';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, m } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import type { ProjectLocalesBySlug } from '@/features/locale-content/utils/switchPath';
import { Link } from '@/i18n/navigation';

import { LogoAnimated } from './LogoAnimated';
import { MenuIcon } from './MenuIcon';

type MenuParts = {
   Menu: typeof import('./Menu').Menu;
   LanguageSwitcher: typeof import('./LanguageSwitcher').LanguageSwitcher;
   ThemeToggle: typeof import('./ThemeToggle').ThemeToggle;
};

let loadedMenuParts: MenuParts | null = null;

async function loadMenuParts(): Promise<MenuParts> {
   if (loadedMenuParts) return loadedMenuParts;
   const [menu, languageSwitcher, themeToggle] = await Promise.all([
      import('./Menu'),
      import('./LanguageSwitcher'),
      import('./ThemeToggle'),
   ]);
   loadedMenuParts = {
      Menu: menu.Menu,
      LanguageSwitcher: languageSwitcher.LanguageSwitcher,
      ThemeToggle: themeToggle.ThemeToggle,
   };
   return loadedMenuParts;
}

const ROW_CLASS =
   'pointer-events-none fixed top-0 left-1/2 z-60 flex h-37.5 w-full max-w-300 -translate-x-1/2 items-center justify-between px-6.25';
const LOGO_CLASS = 'w-37.5 pointer-events-auto -mt-3 shrink-0';
const CONTROLS_CLASS = 'pointer-events-auto flex items-center gap-4';
const MENU_BUTTON_CLASS = 'h-8 w-12 flex items-center justify-center transition-colors';

const LOGO_ON_PAGE = { filter: 'brightness(1) invert(0)' };
const LOGO_ON_BRAND = { filter: 'brightness(0) invert(1)' };
const LOGO_TRANSITION = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

type HeaderProps = {
   projectLocales?: ProjectLocalesBySlug;
};

export function Header({ projectLocales }: HeaderProps) {
   const t = useTranslations('Header');
   const [isMenuOpen, setIsMenuOpen] = useState(false);
   const [menuParts, setMenuParts] = useState<MenuParts | null>(loadedMenuParts);
   const [menuButtonCenter, setMenuButtonCenter] = useState({ x: 0, y: 0 });
   const buttonRef = useRef<HTMLButtonElement>(null);

   const updateMenuButtonCenter = () => {
      if (buttonRef.current) {
         const rect = buttonRef.current.getBoundingClientRect();
         setMenuButtonCenter({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
         });
      }
   };

   const preloadMenu = () => {
      loadMenuParts()
         .then(setMenuParts)
         .catch(() => undefined);
   };

   const handleOpenChange = (open: boolean) => {
      if (!open || menuParts) {
         setIsMenuOpen(open);
         return;
      }
      loadMenuParts()
         .then((parts) => {
            setMenuParts(parts);
            setIsMenuOpen(true);
         })
         .catch(() => undefined);
   };

   const menuHeader = menuParts && (
      <div className={ROW_CLASS}>
         <m.div
            initial={LOGO_ON_PAGE}
            animate={LOGO_ON_BRAND}
            transition={LOGO_TRANSITION}
            className={LOGO_CLASS}
         >
            <Dialog.Close asChild>
               <Link href="/" aria-label={t('home')}>
                  <LogoAnimated />
               </Link>
            </Dialog.Close>
         </m.div>

         <div className={CONTROLS_CLASS}>
            <menuParts.LanguageSwitcher onBrand={true} projectLocales={projectLocales} />
            <menuParts.ThemeToggle />
            <Dialog.Close asChild>
               <button
                  type="button"
                  aria-label={t('closeMenu')}
                  className={cn(MENU_BUTTON_CLASS, 'text-fixed-white')}
               >
                  <MenuIcon isOpen={true} className="h-6 w-auto" />
               </button>
            </Dialog.Close>
         </div>
      </div>
   );

   return (
      <Dialog.Root open={isMenuOpen} onOpenChange={handleOpenChange}>
         <div aria-hidden className="fixed top-0 left-0 z-20 h-37.5 w-full bg-background" />

         <header className={ROW_CLASS}>
            <div
               className={cn(
                  LOGO_CLASS,
                  'transition-[filter] duration-300',
                  isMenuOpen && 'brightness-0 invert',
               )}
            >
               <Link href="/" aria-label={t('home')}>
                  <LogoAnimated />
               </Link>
            </div>

            <div className={CONTROLS_CLASS}>
               <Dialog.Trigger asChild>
                  <button
                     ref={buttonRef}
                     type="button"
                     onClick={updateMenuButtonCenter}
                     onPointerEnter={preloadMenu}
                     onPointerDown={preloadMenu}
                     onFocus={preloadMenu}
                     aria-label={t('openMenu')}
                     className={cn(
                        MENU_BUTTON_CLASS,
                        isMenuOpen ? 'text-fixed-white' : 'text-foreground hover:text-brand',
                     )}
                  >
                     <MenuIcon isOpen={isMenuOpen} className="h-6 w-auto" />
                  </button>
               </Dialog.Trigger>
            </div>
         </header>

         <AnimatePresence>
            {isMenuOpen && menuParts && (
               <menuParts.Menu menuButtonCenter={menuButtonCenter} header={menuHeader} />
            )}
         </AnimatePresence>
      </Dialog.Root>
   );
}
