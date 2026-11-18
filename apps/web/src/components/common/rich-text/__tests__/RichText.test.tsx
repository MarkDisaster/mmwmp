// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RichText } from '@/components/common/rich-text/RichText';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('@/assets/icons/cross.svg', () => ({ default: () => null }));

const OPEN_BUTTON = 'button[data-rich-open]';
const DIALOG = '[role="dialog"]';
const TABLE = '<table><tbody><tr><td>a</td></tr></tbody></table>';
const TABLE_WITH_IMAGE =
   '<table><tbody><tr><td><img src="https://cdn.example/cell.webp" alt="Cell"></td></tr></tbody></table>';
const ORIGINAL = 'https://cdn.example/o.jpg';
const LINKED_IMAGE = `<p><a href="${ORIGINAL}" target="_blank" rel="noopener noreferrer"><img src="https://cdn.example/m.webp" alt="Photo"></a></p>`;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function render(html: string): void {
   act(() => root.render(<RichText html={html} />));
}

function openButtons(): HTMLButtonElement[] {
   return Array.from(container.querySelectorAll<HTMLButtonElement>(OPEN_BUTTON));
}

function dialog(): HTMLElement | null {
   return document.body.querySelector<HTMLElement>(DIALOG);
}

function click(element: Element): void {
   act(() => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
   });
}

function dialogTitle(): string | null {
   const labelledBy = dialog()?.getAttribute('aria-labelledby');
   return labelledBy ? (document.getElementById(labelledBy)?.textContent ?? null) : null;
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

describe('RichText', () => {
   it('should render the html unchanged before the effect', () => {
      const markup = renderToString(<RichText html={`${TABLE}${LINKED_IMAGE}`} />);

      expect(markup).toContain('<table>');
      expect(markup).toContain('class="prose prose-lg max-w-none min-w-0"');
      expect(markup).not.toContain('data-rich-open');
      expect(markup).not.toContain('data-rich-zoom');
   });

   it('should add an open button to a table and an image after mount', () => {
      render(`${TABLE}${LINKED_IMAGE}`);

      const buttons = openButtons();
      expect(buttons).toHaveLength(2);
      expect(buttons[0].getAttribute('aria-label')).toBe('openTable');
      expect(buttons[1].getAttribute('aria-label')).toBe('openImage');
      expect(container.querySelector('[data-rich-zoom="table"] table')).not.toBeNull();
      expect(container.querySelector('[data-rich-zoom="image"] img')).not.toBeNull();
   });

   it('should merge the extra classes with the prose classes', () => {
      act(() => root.render(<RichText html="<p>a</p>" className="pt-12.5" />));

      expect(container.firstElementChild?.className).toBe(
         'prose prose-lg max-w-none min-w-0 pt-12.5',
      );
   });

   it('should open the dialog with the table when its button is clicked', () => {
      render(TABLE_WITH_IMAGE);
      expect(dialog()).toBeNull();

      const tableButton = container.querySelector(
         '[data-rich-zoom="table"] > button[data-rich-open]',
      );
      expect(tableButton).not.toBeNull();
      click(tableButton as Element);

      const table = dialog()?.querySelector('table');
      expect(table).not.toBeNull();
      expect(table?.parentElement?.matches('.prose[data-rich-zoom-view][role="region"]')).toBe(
         true,
      );
      expect(table?.querySelector('img')).not.toBeNull();
      expect(table?.querySelector('button')).toBeNull();
      expect(table?.querySelector('[data-rich-zoom]')).toBeNull();
      expect(dialogTitle()).toBe('tableTitle');
      expect(container.querySelector('table')).not.toBeNull();
      expect(tableButton?.isConnected).toBe(true);
   });

   it('should make the table box a keyboard-scrollable region after the close button', async () => {
      render(TABLE);

      click(openButtons()[0]);
      await flushFocusReturn();

      const region = dialog()?.querySelector<HTMLElement>('[data-rich-zoom-view]');
      expect(region?.getAttribute('role')).toBe('region');
      expect(region?.matches('[aria-label="tableTitle"]')).toBe(true);
      expect(region?.tabIndex).toBe(0);
      const close = dialog()?.querySelector<HTMLButtonElement>('button[aria-label="close"]');
      expect(close).not.toBeNull();
      expect(document.activeElement).toBe(close);
      expect(
         (close as HTMLButtonElement).compareDocumentPosition(region as HTMLElement) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
   });

   it('should open the original image', () => {
      render(LINKED_IMAGE);

      click(openButtons()[0]);

      const img = dialog()?.querySelector('img');
      expect(img?.getAttribute('src')).toBe(ORIGINAL);
      expect(img?.getAttribute('alt')).toBe('Photo');
   });

   it('should title the dialog with the image alt', () => {
      render(LINKED_IMAGE);

      click(openButtons()[0]);

      expect(dialogTitle()).toBe('Photo');
   });

   it('should title the dialog with the image text when the alt is empty', () => {
      render('<p><img src="https://cdn.example/m.webp" alt=""></p>');

      click(openButtons()[0]);

      expect(dialogTitle()).toBe('imageTitle');
   });

   it('should close on the close button and on Escape and return focus to the opening button', async () => {
      render(`${TABLE}${LINKED_IMAGE}`);
      const [tableButton, imageButton] = openButtons();

      click(tableButton);
      const close = dialog()?.querySelector<HTMLButtonElement>('button[aria-label="close"]');
      expect(close).not.toBeNull();
      click(close as HTMLButtonElement);
      await flushFocusReturn();

      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(tableButton);

      click(imageButton);
      expect(dialog()).not.toBeNull();
      act(() => {
         document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });
      await flushFocusReturn();

      expect(dialog()).toBeNull();
      expect(document.activeElement).toBe(imageButton);
   });

   it('should not wrap twice when the html prop changes', () => {
      render(TABLE);
      expect(openButtons()).toHaveLength(1);

      render(`${TABLE}<p>b</p>${TABLE}`);

      const wrappers = container.querySelectorAll('[data-rich-zoom="table"]');
      expect(wrappers).toHaveLength(2);
      expect(openButtons()).toHaveLength(2);
      for (const wrapper of Array.from(wrappers)) {
         expect(wrapper.querySelectorAll(OPEN_BUTTON)).toHaveLength(1);
      }
   });

   it('should open the dialog when the image itself is clicked', () => {
      render(LINKED_IMAGE);
      const img = container.querySelector('img') as HTMLImageElement;

      let notCanceled = true;
      act(() => {
         notCanceled = img.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
         );
      });

      expect(notCanceled).toBe(false);
      expect(dialog()).not.toBeNull();
      expect(dialog()?.querySelector('img')?.getAttribute('src')).toBe(ORIGINAL);
   });

   it('should leave a click with a modifier key or a middle click to the link', () => {
      render(LINKED_IMAGE.replace(ORIGINAL, 'about:blank'));
      const img = container.querySelector('img') as HTMLImageElement;

      for (const init of [
         { ctrlKey: true },
         { metaKey: true },
         { shiftKey: true },
         { button: 1 },
      ]) {
         let notCanceled = false;
         act(() => {
            notCanceled = img.dispatchEvent(
               new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
            );
         });

         expect(notCanceled).toBe(true);
         expect(dialog()).toBeNull();
      }
   });

   it('should open the dialog when a plain image without a link is clicked', () => {
      render('<p><img src="https://cdn.example/m.webp" alt="Plain"></p>');

      click(container.querySelector('img') as HTMLImageElement);

      expect(dialog()?.querySelector('img')?.getAttribute('src')).toBe(
         'https://cdn.example/m.webp',
      );
   });

   it('should leave an image inside a link with text to its link', () => {
      render(
         '<p><a href="about:blank">Read <img src="https://cdn.example/m.webp" alt="x"></a></p>',
      );
      const img = container.querySelector('img') as HTMLImageElement;

      let notCanceled = false;
      act(() => {
         notCanceled = img.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }),
         );
      });

      expect(notCanceled).toBe(true);
      expect(dialog()).toBeNull();
   });
});
