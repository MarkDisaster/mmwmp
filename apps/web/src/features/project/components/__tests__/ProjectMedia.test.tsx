// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicProjectMediaEntity } from '@/api/generated/models/PublicProjectMediaEntity';
import { ProjectMedia } from '@/features/project/components/ProjectMedia';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/assets/icons/cross.svg', () => ({ default: () => null }));
vi.mock('next/image', () => ({
   default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MediaOptions = {
   language?: 'cs' | 'en' | null;
   mimeType?: string;
   displayName?: string | null;
   withMedium?: boolean;
   altText?: string | null;
};

function item(id: number, sortOrder: number, options: MediaOptions = {}): PublicProjectMediaEntity {
   const {
      language = null,
      mimeType = 'image/png',
      displayName = `file-${id}`,
      withMedium,
      altText = `alt-${id}`,
   } = options;
   const variant = (name: 'original' | 'medium', url: string) => ({
      id: id * 10,
      variant: name,
      mimeType,
      width: 100,
      height: 50,
      publicUrl: url,
   });

   return {
      id,
      projectId: 1,
      fileId: id,
      language,
      sortOrder,
      file: {
         id,
         displayName,
         altText,
         mimeType,
         width: 1000,
         height: 500,
         language,
         variants: [
            variant('original', `https://cdn.example/${id}-original`),
            ...(withMedium === false
               ? []
               : [variant('medium', `https://cdn.example/${id}-medium`)]),
         ],
      },
   };
}

let container: HTMLDivElement;
let root: Root;

function render(media: PublicProjectMediaEntity[], locale = 'cs'): void {
   act(() => root.render(<ProjectMedia media={media} locale={locale} />));
}

function imageButtons(): HTMLButtonElement[] {
   return Array.from(container.querySelectorAll<HTMLButtonElement>('button'));
}

function dialog(): HTMLElement | null {
   return document.body.querySelector<HTMLElement>('[role="dialog"]');
}

async function flushFocusReturn(): Promise<void> {
   await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
   });
}

beforeEach(() => {
   container = document.createElement('div');
   document.body.append(container);
   root = createRoot(container);
});

afterEach(() => {
   act(() => root.unmount());
   container.remove();
});

describe('ProjectMedia', () => {
   it('should render nothing without media', () => {
      render([]);

      expect(container.innerHTML).toBe('');
   });

   it('should keep media for all languages and for the page language only', () => {
      const media = [
         item(1, 0, { language: null }),
         item(2, 1, { language: 'en' }),
         item(3, 2, { language: 'cs' }),
      ];

      render(media, 'cs');
      expect(Array.from(container.querySelectorAll('img')).map((img) => img.alt)).toEqual([
         'alt-1',
         'alt-3',
      ]);

      render(media, 'en');
      expect(Array.from(container.querySelectorAll('img')).map((img) => img.alt)).toEqual([
         'alt-1',
         'alt-2',
      ]);
   });

   it('should render nothing when no item matches the language', () => {
      render([item(1, 0, { language: 'en' })], 'cs');

      expect(container.innerHTML).toBe('');
   });

   it('should order the media by sortOrder', () => {
      render([item(1, 5), item(2, 1), item(3, 3)]);

      expect(Array.from(container.querySelectorAll('img')).map((img) => img.alt)).toEqual([
         'alt-2',
         'alt-3',
         'alt-1',
      ]);
   });

   it('should show the medium variant and fall back to the original', () => {
      render([item(1, 0), item(2, 1, { withMedium: false })]);

      expect(Array.from(container.querySelectorAll('img')).map((img) => img.src)).toEqual([
         'https://cdn.example/1-medium',
         'https://cdn.example/2-original',
      ]);
   });

   it('should open the full-screen view with the original image when an image is clicked', () => {
      render([item(1, 0)]);

      expect(dialog()).toBeNull();
      expect(imageButtons()[0].getAttribute('aria-label')).toBe('openImage: alt-1');

      act(() => {
         imageButtons()[0].click();
      });

      expect(dialog()?.querySelector('img')?.getAttribute('src')).toBe(
         'https://cdn.example/1-original',
      );
   });

   it('should give every image button its own name and use the plain label without an alt', () => {
      render([item(1, 0), item(2, 1), item(3, 2, { altText: null })]);

      expect(imageButtons().map((button) => button.getAttribute('aria-label'))).toEqual([
         'openImage: alt-1',
         'openImage: alt-2',
         'openImage',
      ]);
   });

   it('should return focus to the clicked image button on close', async () => {
      render([item(1, 0), item(2, 1)]);
      const second = imageButtons()[1];

      act(() => {
         second.click();
      });
      expect(dialog()).not.toBeNull();

      act(() => {
         document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      await flushFocusReturn();

      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(second);
   });

   it('should list a file that is no image as a link to the original', () => {
      render([item(1, 0), item(2, 1, { mimeType: 'application/pdf', displayName: 'Brochure' })]);

      const link = container.querySelector<HTMLAnchorElement>('a');

      expect(imageButtons()).toHaveLength(1);
      expect(link?.getAttribute('href')).toBe('https://cdn.example/2-original');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link?.textContent).toContain('Brochure');
      expect(container.textContent).toContain('mediaFiles');
   });

   it('should show only the list when there are only files', () => {
      render([item(1, 0, { mimeType: 'application/pdf' })]);

      expect(container.querySelector('img')).toBeNull();
      expect(imageButtons()).toHaveLength(0);
      expect(container.querySelectorAll('a')).toHaveLength(1);
   });
});
