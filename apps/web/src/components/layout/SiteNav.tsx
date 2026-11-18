import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import type { LocaleContent } from '@/features/locale-content/utils/localeContent';
import { PAGE_PATHS } from '@/features/locale-content/utils/localeContent';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

type SiteNavProps = {
   locale: Locale;
   content: LocaleContent;
};

export async function SiteNav({ locale, content }: SiteNavProps) {
   const t = await getTranslations({ locale, namespace: 'Header' });
   const otherLocales = routing.locales.filter(
      (other) => other !== locale && content.locales.includes(other),
   );
   const languageNames = await Promise.all(
      otherLocales.map(async (other) => ({
         locale: other,
         name: (await getTranslations({ locale: other, namespace: 'Header' }))('languageName'),
      })),
   );

   return (
      <nav aria-label={t('siteNavigation')} className="sr-only">
         <ul>
            <li>
               <Link href={PAGE_PATHS.projects} tabIndex={-1}>
                  {t('projects')}
               </Link>
            </li>
            <li>
               <Link href={PAGE_PATHS.about} tabIndex={-1}>
                  {t('about')}
               </Link>
            </li>
            {content.hasContact && (
               <li>
                  <Link href={PAGE_PATHS.contact} tabIndex={-1}>
                     {t('contact')}
                  </Link>
               </li>
            )}
            {languageNames.map(({ locale: other, name }) => (
               <li key={other}>
                  <Link href="/" locale={other} hrefLang={other} lang={other} tabIndex={-1}>
                     {name}
                  </Link>
               </li>
            ))}
         </ul>
      </nav>
   );
}
