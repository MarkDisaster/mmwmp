'use client';

import { type Locale, useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Select } from '@/components/common/Select';
import {
   type ProjectLocalesBySlug,
   resolveSwitchPathname,
} from '@/features/locale-content/utils/switchPath';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type LanguageSwitcherProps = {
   onBrand?: boolean;
   projectLocales?: ProjectLocalesBySlug;
};

export function LanguageSwitcher({ onBrand = false, projectLocales = {} }: LanguageSwitcherProps) {
   const t = useTranslations('Header');
   const locale = useLocale();
   const router = useRouter();
   const pathname = usePathname();
   const [isPending, startTransition] = useTransition();

   const handleChange = (next: Locale) => {
      const query = Object.fromEntries(new URLSearchParams(window.location.search).entries());
      startTransition(() => {
         router.replace(
            { pathname: resolveSwitchPathname(pathname, next, projectLocales), query },
            { locale: next },
         );
      });
   };

   const options = routing.locales.map((loc) => ({
      value: loc,
      label: loc.toUpperCase(),
   }));

   return (
      <Select
         value={locale}
         onChange={handleChange}
         options={options}
         ariaLabel={t('language')}
         align="end"
         onBrand={onBrand}
         disabled={isPending}
      />
   );
}
