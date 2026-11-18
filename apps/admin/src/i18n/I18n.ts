import type { Resource } from 'i18next';
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { z } from 'zod/v4';

import { SUPPORTED_LANGUAGES } from './constants';
import csLocale from './locales/cs.json';
import enLocale from './locales/en.json';

export class I18n {
   public static readonly SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;

   public static readonly FALLBACK_LANGUAGE = this.SUPPORTED_LANGUAGES[0];

   public static readonly RESOURCES = {
      cs: { translation: csLocale },
      en: { translation: enLocale },
   } satisfies Resource;

   public static async init() {
      if (i18next.isInitializing || i18next.isInitialized) {
         return;
      }

      const zodLocales: Record<string, () => Record<string, unknown>> = {
         cs: z.locales.cs as () => Record<string, unknown>,
         en: z.locales.en as () => Record<string, unknown>,
      };

      await i18next
         .use(LanguageDetector)
         .use(initReactI18next)
         .init({
            supportedLngs: this.SUPPORTED_LANGUAGES,
            fallbackLng: this.FALLBACK_LANGUAGE,
            resources: this.RESOURCES,
            detection: {
               order: ['localStorage', 'navigator'],
               caches: ['localStorage'],
               lookupLocalStorage: 'lng',
            },
            interpolation: {
               escapeValue: false,
            },
         });

      const setZodLocale = (lng: string) => {
         const locale = zodLocales[lng];
         if (locale) z.config(locale());
      };

      setZodLocale(i18next.language);
      i18next.on('languageChanged', setZodLocale);
   }
}
