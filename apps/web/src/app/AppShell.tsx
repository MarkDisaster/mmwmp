import { type Locale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

import { CursorFollower } from '@/components/common/CursorFollower';
import { Header } from '@/components/layout/Header';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteNav } from '@/components/layout/SiteNav';
import { getLocaleContentSafe } from '@/features/locale-content/api/getLocaleContent';
import { toProjectLocalesBySlug } from '@/features/locale-content/utils/switchPath';

import { fontVariables } from './fonts/fonts';
import { Providers } from './Providers';

type AppShellProps = Readonly<{
   locale: Locale;
   children: ReactNode;
}>;

export async function AppShell({ locale, children }: AppShellProps) {
   const messages = await getMessages({ locale });
   const t = await getTranslations({ locale, namespace: 'Header' });
   const content = await getLocaleContentSafe();

   return (
      <html lang={locale} className={fontVariables} suppressHydrationWarning>
         <body className="flex flex-col items-center">
            <Providers>
               <NextIntlClientProvider locale={locale} messages={messages}>
                  <a
                     href="#main"
                     className="sr-only bg-brand text-brand-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
                  >
                     {t('skipToContent')}
                  </a>
                  <CursorFollower />
                  <div className="flex min-h-dvh w-full max-w-300 flex-col items-center">
                     <SiteNav locale={locale} content={content} />
                     <Header projectLocales={toProjectLocalesBySlug(content.projects)} />
                     <main
                        id="main"
                        tabIndex={-1}
                        className="peer mt-37.5 w-full max-w-300 outline-none"
                     >
                        {children}
                     </main>
                     <SiteFooter />
                  </div>
               </NextIntlClientProvider>
            </Providers>
         </body>
      </html>
   );
}
