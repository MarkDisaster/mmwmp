import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { afterEach } from 'vitest';

import { I18n } from '@/i18n/I18n';

globalThis.ResizeObserver ??= class {
   observe() {}
   unobserve() {}
   disconnect() {}
};
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
   cleanup();
});

await i18next.use(initReactI18next).init({
   lng: 'en',
   resources: I18n.RESOURCES,
   interpolation: { escapeValue: false },
   showSupportNotice: false,
});
