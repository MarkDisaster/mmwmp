import { afterEach, describe, expect, it, vi } from 'vitest';

import { openInNewTab } from '../usePreviewUrl';

const BLANK = 'about:blank';
const PREVIEW_URL = 'https://marek.media/api/draft?secret=s&slug=web';

const stubWindowOpen = (tab: {
   opener: unknown;
   location: { href: string };
   close: () => void;
}) => {
   const open = vi.fn(() => tab);
   vi.stubGlobal('window', { open });
   return open;
};

const createTab = () => ({
   opener: {} as unknown,
   location: { href: BLANK },
   close: vi.fn(),
});

afterEach(() => {
   vi.unstubAllGlobals();
});

describe('openInNewTab', () => {
   it('should open the tab before the URL is loaded and navigate it once it is', async () => {
      const tab = createTab();
      const open = stubWindowOpen(tab);
      let resolveUrl!: (url: string) => void;
      const loadUrl = vi.fn(() => new Promise<string>((resolve) => (resolveUrl = resolve)));

      const opened = openInNewTab(loadUrl);

      expect(open).toHaveBeenCalledWith(BLANK, '_blank');
      expect(tab.opener).toBeNull();
      expect(tab.location.href).toBe(BLANK);

      resolveUrl(PREVIEW_URL);
      await expect(opened).resolves.toBe(true);
      expect(tab.location.href).toBe(PREVIEW_URL);
      expect(tab.close).not.toHaveBeenCalled();
   });

   it('should close the tab when the URL cannot be loaded', async () => {
      const tab = createTab();
      stubWindowOpen(tab);

      await expect(openInNewTab(() => Promise.reject(new Error('404')))).resolves.toBe(false);
      expect(tab.close).toHaveBeenCalledTimes(1);
      expect(tab.location.href).toBe(BLANK);
   });

   it('should not load the URL when the browser blocked the tab', async () => {
      vi.stubGlobal('window', { open: vi.fn(() => null) });
      const loadUrl = vi.fn(() => Promise.resolve(PREVIEW_URL));

      await expect(openInNewTab(loadUrl)).resolves.toBe(false);
      expect(loadUrl).not.toHaveBeenCalled();
   });
});
