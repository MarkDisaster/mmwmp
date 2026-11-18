import { SUPPORTED_LANGUAGES } from '@/i18n/constants';

export const toLanguageCode = (language: string | undefined): string =>
   language?.split('-')[0] || SUPPORTED_LANGUAGES[0];
