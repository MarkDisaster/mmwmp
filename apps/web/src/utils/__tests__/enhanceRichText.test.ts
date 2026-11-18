// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';

import { enhanceRichText, readZoomTarget, resolveImageSrc } from '@/utils/enhanceRichText';

const IMAGE_WRAPPER = '[data-rich-zoom="image"]';
const TABLE_WRAPPER = '[data-rich-zoom="table"]';
const ANY_WRAPPER = '[data-rich-zoom]';
const OPEN_BUTTON = 'button[data-rich-open]';
const labels = { openTable: 'Open table', openImage: 'Open image' };

function build(html: string): HTMLElement {
   const root = document.createElement('div');
   root.innerHTML = html;
   return root;
}

describe('enhanceRichText', () => {
   it('should wrap a table in a scroll block and add one button with the label', () => {
      const root = build('<table><tbody><tr><td>a</td></tr></tbody></table>');
      enhanceRichText(root, labels);

      const wrapper = root.querySelector(TABLE_WRAPPER);
      expect(wrapper).not.toBeNull();
      const scroll = wrapper?.querySelector(':scope > [data-rich-scroll]');
      expect(scroll?.querySelector(':scope > table')).not.toBeNull();
      const buttons = wrapper?.querySelectorAll(':scope > button[data-rich-open]');
      expect(buttons).toHaveLength(1);
      expect(buttons?.[0].getAttribute('aria-label')).toBe('Open table');
      expect(buttons?.[0].getAttribute('type')).toBe('button');
      expect(buttons?.[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(scroll?.querySelector('button')).toBeNull();
   });

   it('should wrap a plain image and add a button', () => {
      const root = build('<p><img src="https://x.test/a.png" alt="A"></p>');
      const img = root.querySelector('img');
      enhanceRichText(root, labels);

      const wrapper = root.querySelector(IMAGE_WRAPPER);
      expect(wrapper?.tagName).toBe('SPAN');
      expect(wrapper?.contains(img)).toBe(true);
      expect(wrapper?.querySelector(OPEN_BUTTON)?.getAttribute('aria-label')).toBe('Open image');
   });

   it('should wrap a linked image together with its link', () => {
      const root = build('<a href="https://x.test/big.png"><img src="https://x.test/s.png"></a>');
      enhanceRichText(root, labels);

      const wrapper = root.querySelector(IMAGE_WRAPPER);
      expect(wrapper?.querySelector(':scope > a > img')).not.toBeNull();
      expect(wrapper?.querySelectorAll('button')).toHaveLength(1);
   });

   it('should add no wrapper and no button to an image in a link with text', () => {
      const root = build('<a href="https://x.test/p">Text <img src="https://x.test/s.png"></a>');
      const link = root.querySelector('a');
      const img = root.querySelector('img');
      enhanceRichText(root, labels);
      enhanceRichText(root, labels);

      expect(root.querySelector(ANY_WRAPPER)).toBeNull();
      expect(root.querySelector('button')).toBeNull();
      expect(root.firstElementChild).toBe(link);
      expect(img?.parentElement).toBe(link);
   });

   it('should not wrap twice when called again', () => {
      const root = build('<table><tr><td>a</td></tr></table><img src="https://x.test/a.png">');
      enhanceRichText(root, labels);
      enhanceRichText(root, labels);

      expect(root.querySelectorAll(ANY_WRAPPER)).toHaveLength(2);
      expect(root.querySelectorAll(OPEN_BUTTON)).toHaveLength(2);
   });

   it('should not wrap a nested table twice when called again', () => {
      const root = build('<table><tr><td><table><tr><td>in</td></tr></table></td></tr></table>');
      enhanceRichText(root, labels);
      enhanceRichText(root, labels);

      expect(root.querySelectorAll(TABLE_WRAPPER)).toHaveLength(2);
      expect(root.querySelectorAll(OPEN_BUTTON)).toHaveLength(2);
   });

   it('should keep the identity of the original image node', () => {
      const root = build('<img src="https://x.test/a.png">');
      const img = root.querySelector('img');
      enhanceRichText(root, labels);
      expect(root.querySelector(ANY_WRAPPER)?.contains(img)).toBe(true);
   });

   it('should not wrap twice on a root with already enhanced content', () => {
      const first = build('<img src="https://x.test/a.png">');
      enhanceRichText(first, labels);
      const second = build(first.innerHTML);
      enhanceRichText(second, labels);

      expect(second.querySelectorAll(ANY_WRAPPER)).toHaveLength(1);
      expect(second.querySelectorAll('button')).toHaveLength(1);
   });

   it('should add buttons to every table and image of an article with several', () => {
      const root = build(
         '<table><tr><td>1</td></tr></table><img src="https://x.test/1.png">' +
            '<table><tr><td>2</td></tr></table><img src="https://x.test/2.png">',
      );
      enhanceRichText(root, labels);

      expect(root.querySelectorAll(TABLE_WRAPPER)).toHaveLength(2);
      expect(root.querySelectorAll(IMAGE_WRAPPER)).toHaveLength(2);
      expect(root.querySelectorAll(OPEN_BUTTON)).toHaveLength(4);
   });

   it('should wrap tables inside a list item and a nested table in a table cell', () => {
      const root = build(
         '<ul><li><table><tr><td>x</td></tr></table></li></ul>' +
            '<table><tr><td><table><tr><td>in</td></tr></table></td></tr></table>',
      );
      enhanceRichText(root, labels);

      expect(root.querySelector('li > [data-rich-zoom="table"]')).not.toBeNull();
      expect(root.querySelectorAll(TABLE_WRAPPER)).toHaveLength(3);
   });
});

describe('enhanceRichText start marker', () => {
   const IMG = '<img src="https://x.test/a.png" alt="A">';
   const START = '[data-rich-zoom="image"][data-rich-start]';

   it('should mark an image that opens its paragraph', () => {
      const root = build(`<p>${IMG} text after</p>`);
      enhanceRichText(root, labels);
      expect(root.querySelectorAll(START)).toHaveLength(1);
   });

   it('should mark an image that is first inside a heading followed by text', () => {
      const root = build(`<h2>${IMG} Heading text</h2>`);
      enhanceRichText(root, labels);
      expect(root.querySelector(`h2 > ${START}`)).not.toBeNull();
   });

   it('should not mark an image that follows text in the same paragraph', () => {
      const root = build(`<p>text ${IMG}</p>`);
      enhanceRichText(root, labels);
      expect(root.querySelector(IMAGE_WRAPPER)).not.toBeNull();
      expect(root.querySelector(START)).toBeNull();
   });

   it('should not mark a second image in a paragraph', () => {
      const root = build(`<p>${IMG}${IMG}</p>`);
      enhanceRichText(root, labels);
      const wrappers = root.querySelectorAll(IMAGE_WRAPPER);
      expect(wrappers).toHaveLength(2);
      expect(wrappers[0].hasAttribute('data-rich-start')).toBe(true);
      expect(wrappers[1].hasAttribute('data-rich-start')).toBe(false);
   });

   it('should mark an image wrapped in a link that opens its paragraph', () => {
      const root = build(`<p><a href="https://x.test/big.png">${IMG}</a></p>`);
      enhanceRichText(root, labels);
      expect(root.querySelector(`p > ${START}`)).not.toBeNull();
   });

   it('should not mark an image in a link that follows text', () => {
      const root = build(`<p>text <a href="https://x.test/big.png">${IMG}</a></p>`);
      enhanceRichText(root, labels);
      expect(root.querySelector(START)).toBeNull();
   });
});

describe('readZoomTarget', () => {
   it('readZoomTarget should return the cloned table for a table button', () => {
      const root = build('<table><tr><td>a</td></tr></table>');
      const original = root.querySelector('table');
      enhanceRichText(root, labels);

      const button = root.querySelector('button') as HTMLElement;
      const target = readZoomTarget(button);
      expect(target?.kind).toBe('table');
      if (target?.kind !== 'table') return;
      expect(target.table).not.toBe(original);
      expect(target.table.outerHTML).toBe(original?.outerHTML);
   });

   it('readZoomTarget should return a clean clone without buttons or wrappers', () => {
      const root = build(
         '<table><tr><td><table><tr><td>in</td></tr></table><img src="https://x.test/a.png"></td></tr></table>',
      );
      enhanceRichText(root, labels);
      const outer = root.querySelector(TABLE_WRAPPER) as HTMLElement;

      const target = readZoomTarget(outer.querySelector(':scope > button') as HTMLElement);
      expect(target?.kind).toBe('table');
      if (target?.kind !== 'table') return;
      expect(target.table.querySelector('button')).toBeNull();
      expect(target.table.querySelector(ANY_WRAPPER)).toBeNull();
      expect(target.table.querySelector('[data-rich-scroll]')).toBeNull();
      expect(target.table.querySelectorAll('table')).toHaveLength(1);
      expect(target.table.querySelector('img')).not.toBeNull();
      expect(outer.querySelectorAll(ANY_WRAPPER).length).toBeGreaterThan(1);
      expect(outer.contains(target.table.querySelector('img'))).toBe(false);
      expect(root.querySelectorAll(OPEN_BUTTON).length).toBeGreaterThan(1);
   });

   it('readZoomTarget should return the href of a linked image', () => {
      const root = build(
         '<a href="https://x.test/big.png"><img src="https://x.test/s.png" alt="A"></a>',
      );
      enhanceRichText(root, labels);

      const target = readZoomTarget(root.querySelector('button') as HTMLElement);
      expect(target).toEqual({ kind: 'image', src: 'https://x.test/big.png', alt: 'A' });
   });

   it('readZoomTarget should return the src when the link is not an image file', () => {
      const root = build('<a href="https://x.test/page"><img src="https://x.test/m.webp"></a>');
      enhanceRichText(root, labels);

      const target = readZoomTarget(root.querySelector('button') as HTMLElement);
      expect(target).toEqual({ kind: 'image', src: 'https://x.test/m.webp', alt: '' });
   });

   it('readZoomTarget should return the src of an image without a link', () => {
      const root = build('<img src="https://x.test/m.webp" alt="M">');
      enhanceRichText(root, labels);

      const target = readZoomTarget(root.querySelector('button') as HTMLElement);
      expect(target).toEqual({ kind: 'image', src: 'https://x.test/m.webp', alt: 'M' });
   });

   it('readZoomTarget should return null for a button outside a wrapper', () => {
      const button = document.createElement('button');
      expect(readZoomTarget(button)).toBeNull();
   });
});

describe('resolveImageSrc', () => {
   function linked(href: string): HTMLImageElement {
      const root = build(`<a href="${href}"><img src="https://x.test/s.png"></a>`);
      return root.querySelector('img') as HTMLImageElement;
   }

   it('resolveImageSrc should accept uppercase and query strings of an image link', () => {
      expect(resolveImageSrc(linked('https://x.test/O.JPG?v=1'))).toBe('https://x.test/O.JPG?v=1');
   });

   it('resolveImageSrc should resolve a relative image link and keep its fragment', () => {
      expect(resolveImageSrc(linked('/img/big.avif#top'))).toMatch(
         /^https?:\/\/[^/]+\/img\/big\.avif#top$/,
      );
   });

   it('resolveImageSrc should use the src for a javascript: or data: href', () => {
      expect(resolveImageSrc(linked('javascript:alert(1)//a.png'))).toBe('https://x.test/s.png');
      expect(resolveImageSrc(linked('data:image/png;base64,AAAA'))).toBe('https://x.test/s.png');
   });
});
