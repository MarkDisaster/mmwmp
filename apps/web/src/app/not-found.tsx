import { setRequestLocale } from 'next-intl/server';

import { routing } from '@/i18n/routing';

import LocaleNotFound from './[locale]/not-found';
import { AppShell } from './AppShell';

export default function NotFound() {
   setRequestLocale(routing.defaultLocale);

   return (
      <AppShell locale={routing.defaultLocale}>
         <LocaleNotFound />
      </AppShell>
   );
}
