import {
   createMemoryHistory,
   createRootRoute,
   createRouter,
   RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';

import { AiChatMarkdown } from '../AiChatMarkdown';

window.matchMedia ??= (query: string) =>
   ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
   }) as MediaQueryList;

const renderMarkdown = async (text: string) => {
   const rootRoute = createRootRoute({ component: () => <AiChatMarkdown text={text} /> });
   const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
   });
   const view = render(<RouterProvider router={router} />);
   return { router, view };
};

const PROJECT_PATH = '/projects/12';

const expectExternalLink = (link: HTMLElement, href: string) => {
   expect(link).toHaveAttribute('href', href);
   expect(link).toHaveAttribute('target', '_blank');
   expect(link).toHaveAttribute('rel', 'noopener noreferrer');
};

describe('AiChatMarkdown', () => {
   beforeEach(() => {
      useAiChatStore.getState().setMode('fullpage');
   });

   it('should render the Markdown the persona prompt asks for', async () => {
      await renderMarkdown('Tři projekty:\n- **Selltoro** (id 12)\n- Vinisto');

      expect(await screen.findByText('Selltoro')).toContainHTML('<strong>Selltoro</strong>');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
   });

   it('should open an admin link through the router and move a full-screen chat aside', async () => {
      const { router } = await renderMarkdown(`Otevírám [Selltoro](${PROJECT_PATH}).`);

      const link = await screen.findByRole('link', { name: 'Selltoro' });
      expect(link).toHaveAttribute('href', PROJECT_PATH);
      expect(link).not.toHaveAttribute('target');

      await userEvent.click(link);

      expect(router.state.location.pathname).toBe(PROJECT_PATH);
      expect(useAiChatStore.getState().mode).toBe('sidebar');
   });

   it('should open an external link in a new tab without opener and referrer', async () => {
      await renderMarkdown('Web: [selltoro.cz](https://selltoro.cz)');

      const link = await screen.findByRole('link', { name: 'selltoro.cz' });
      expectExternalLink(link, 'https://selltoro.cz/');
   });

   it('should render unsafe or unknown links as their text only', async () => {
      await renderMarkdown(
         '[klik](javascript:alert(1)) [login](/login) [data](data:text/html,x) [jiná](//evil.example/x)',
      );

      expect(await screen.findByText(/klik/)).toBeInTheDocument();
      expect(screen.queryAllByRole('link')).toEqual([]);
   });

   it('should open an absolute URL of a known admin page through the router', async () => {
      const { origin } = window.location;
      await renderMarkdown(`Otevírám [Selltoro](${origin}${PROJECT_PATH}).`);

      const link = await screen.findByRole('link', { name: 'Selltoro' });
      expect(link).toHaveAttribute('href', PROJECT_PATH);
      expect(link).not.toHaveAttribute('target');
   });

   it('should render an absolute URL of an unknown admin path as its text only', async () => {
      const { origin } = window.location;
      await renderMarkdown(
         `[přihlášení](${origin}/login) [heslo](${origin}/reset-password/abc.def) ` +
            `[neznámá](${origin}${PROJECT_PATH}/secret)`,
      );

      expect(await screen.findByText(/přihlášení/)).toBeInTheDocument();
      expect(screen.queryAllByRole('link')).toEqual([]);
   });

   it('should open a URL of another origin as an external link', async () => {
      await renderMarkdown('[jiný původ](https://evil.example/login)');

      const link = await screen.findByRole('link', { name: 'jiný původ' });
      expectExternalLink(link, 'https://evil.example/login');
   });

   it('should never inject raw HTML or load images from the text', async () => {
      const { view } = await renderMarkdown(
         'A <img src="https://evil.example/x.png?d=secret" onerror="alert(1)"> <script>alert(1)</script> ' +
            '![x](https://evil.example/pixel.png) <b>bold</b>',
      );

      await screen.findByText(/^A/);
      expect(view.container.querySelector('img, script, b')).toBeNull();
   });
});
