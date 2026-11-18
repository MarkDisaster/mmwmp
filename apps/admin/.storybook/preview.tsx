import '../src/globals.css';

import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';

import { I18n } from '../src/i18n/I18n';

const queryClient = new QueryClient({
   defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

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
   },
   loaders: [
      async () => {
         await I18n.init();
         await i18next.changeLanguage('en');
      },
   ],
   decorators: [
      withThemeByClassName({
         themes: { light: '', dark: 'dark' },
         defaultTheme: 'light',
      }),
      (Story) => (
         <QueryClientProvider client={queryClient}>
            <Story />
         </QueryClientProvider>
      ),
   ],
};

export default preview;
