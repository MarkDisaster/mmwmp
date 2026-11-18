import '../src/app/globals.css';

import { cn } from '@mm/utils/cn';
import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/nextjs';
import { domAnimation, LazyMotion } from 'motion/react';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider, useTheme } from 'next-themes';
import { type ReactNode, useEffect, useRef } from 'react';

import { fontVariables } from '../src/app/fonts/fonts';

const MESSAGES_CS = {
   Preview: {
      banner: '<exit>Ukončit preview</exit>',
      exitDraftMode: 'Ukončit preview',
   },
   HomePage: {
      name: 'MAREK',
      role1: 'Software',
      role2: 'developer',
      cta: 'Kontakt',
   },
   RunnerGame: {
      pressStart: 'Skoč mezerníkem',
      gameOver: 'Konec hry',
      section: 'Hra',
   },
   Contact: {
      title: 'Kontakt',
      cta: 'Napsat',
      ico: 'IČO',
      notVatPayer: 'Není plátce DPH',
   },
   Services: { aboutTitle: 'Služby' },
   Projects: { backToProjects: 'Zpět na projekty' },
   Header: {
      menuTitle: 'Menu',
      projects: 'Projekty',
      about: 'O mně',
      contact: 'Kontakt',
      language: 'Jazyk',
      github: 'GitHub (opens in a new tab)',
      linkedin: 'LinkedIn (opens in a new tab)',
   },
};

const MESSAGES_EN = {
   Preview: {
      banner: '<exit>Exit preview mode</exit>',
      exitDraftMode: 'Exit preview mode',
   },
   HomePage: { name: 'MAREK', role1: 'Software', role2: 'developer', cta: 'Contact' },
   RunnerGame: {
      pressStart: 'Press space to start',
      gameOver: 'Game over',
      section: 'Game',
   },
   Contact: { title: 'Contact', cta: 'Write', ico: 'ID', notVatPayer: 'Not VAT payer' },
   Services: { aboutTitle: 'Services' },
   Projects: { backToProjects: 'Back to projects' },
   Header: {
      menuTitle: 'Menu',
      projects: 'Projects',
      about: 'About',
      contact: 'Contact',
      language: 'Language',
      github: 'GitHub (opens in a new tab)',
      linkedin: 'LinkedIn (opens in a new tab)',
   },
};

const messagesByLocale = {
   cs: MESSAGES_CS,
   en: MESSAGES_EN,
} as const;

type Locale = keyof typeof messagesByLocale;

function FontVariablesOnRoot() {
   useEffect(() => {
      const classes = fontVariables.split(/\s+/).filter(Boolean);
      document.documentElement.classList.add(...classes);
      return () => document.documentElement.classList.remove(...classes);
   }, []);
   return null;
}

function ThemeSync({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
   const { setTheme } = useTheme();
   const appliedTheme = useRef<'light' | 'dark'>(undefined);
   useEffect(() => {
      if (appliedTheme.current === theme) return;
      appliedTheme.current = theme;
      setTheme(theme);
   }, [theme, setTheme]);
   return <>{children}</>;
}

const preview: Preview = {
   parameters: {
      controls: {
         matchers: {
            color: /(background|color)$/i,
            date: /Date$/i,
         },
      },
      backgrounds: { disable: true },
      docs: { toc: true },
      nextjs: {
         appDirectory: true,
         navigation: { pathname: '/' },
      },
   },
   globalTypes: {
      locale: {
         name: 'Locale',
         description: 'Active i18n locale for next-intl provider',
         toolbar: {
            icon: 'globe',
            items: [
               { value: 'cs', title: 'Čeština', right: 'CS' },
               { value: 'en', title: 'English', right: 'EN' },
            ],
            dynamicTitle: true,
         },
      },
   },
   initialGlobals: { locale: 'cs' },
   decorators: [
      withThemeByClassName({
         themes: { light: '', dark: 'dark' },
         defaultTheme: 'light',
      }),
      (Story, ctx) => {
         const theme = (ctx.globals.theme as 'light' | 'dark') ?? 'light';
         return (
            <ThemeProvider
               attribute="class"
               enableSystem={false}
               defaultTheme="light"
               disableTransitionOnChange
            >
               <ThemeSync theme={theme}>
                  <Story />
               </ThemeSync>
            </ThemeProvider>
         );
      },
      (Story) => (
         <div className={cn(fontVariables, 'bg-background font-body text-foreground')}>
            <FontVariablesOnRoot />
            <Story />
         </div>
      ),
      (Story) => (
         <LazyMotion features={domAnimation} strict>
            <Story />
         </LazyMotion>
      ),
      (Story, ctx) => {
         const locale = (ctx.globals.locale as Locale) ?? 'cs';
         return (
            <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
               <Story />
            </NextIntlClientProvider>
         );
      },
   ],
};

export default preview;
