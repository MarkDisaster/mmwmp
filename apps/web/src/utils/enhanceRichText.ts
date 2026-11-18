export type RichTextLabels = { openTable: string; openImage: string };

export type ZoomTarget =
   | { kind: 'table'; table: HTMLTableElement }
   | { kind: 'image'; src: string; alt: string };

const ZOOM_ATTR = 'data-rich-zoom';
const START_ATTR = 'data-rich-start';

const IMAGE_PATH = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

const EXPAND_ICON =
   '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" ' +
   'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
   'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
   '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';

function createButton(doc: Document, label: string): HTMLButtonElement {
   const button = doc.createElement('button');
   button.type = 'button';
   button.setAttribute('data-rich-open', '');
   button.setAttribute('aria-label', label);
   button.innerHTML = EXPAND_ICON;
   return button;
}

function isWrapped(element: Element): boolean {
   const parent = element.parentElement;
   if (!parent) return false;
   if (element.tagName === 'TABLE') return parent.hasAttribute('data-rich-scroll');
   return (
      parent.getAttribute(ZOOM_ATTR) === 'image' ||
      parent.parentElement?.getAttribute(ZOOM_ATTR) === 'image'
   );
}

function wrapNode(node: Element, wrapper: HTMLElement, button: HTMLButtonElement): void {
   node.parentNode?.replaceChild(wrapper, node);
   wrapper.append(node, button);
}

function wrapTable(table: HTMLTableElement, label: string): void {
   const doc = table.ownerDocument;
   const wrapper = doc.createElement('div');
   wrapper.setAttribute(ZOOM_ATTR, 'table');
   const scroll = doc.createElement('div');
   scroll.setAttribute('data-rich-scroll', '');
   table.parentNode?.replaceChild(wrapper, table);
   scroll.append(table);
   wrapper.append(scroll, createButton(doc, label));
}

function onlyWrapsImage(link: HTMLAnchorElement): boolean {
   return (
      link.children.length === 1 &&
      link.querySelectorAll('img').length === 1 &&
      (link.textContent ?? '').trim() === ''
   );
}

function wrapImage(img: HTMLImageElement, label: string): void {
   const doc = img.ownerDocument;
   const parent = img.parentElement;
   const link = img.closest('a');
   if (link && !(link === parent && onlyWrapsImage(link))) return;
   const wrapper = doc.createElement('span');
   wrapper.setAttribute(ZOOM_ATTR, 'image');
   const replaced = link ?? img;
   const startsBlock = replaced.previousSibling === null;
   wrapNode(replaced, wrapper, createButton(doc, label));
   if (startsBlock) wrapper.setAttribute(START_ATTR, '');
}

export function enhanceRichText(root: HTMLElement, labels: RichTextLabels): void {
   for (const table of Array.from(root.querySelectorAll('table'))) {
      if (!isWrapped(table)) wrapTable(table, labels.openTable);
   }
   for (const img of Array.from(root.querySelectorAll('img'))) {
      if (!isWrapped(img)) wrapImage(img, labels.openImage);
   }
}

export function resolveImageSrc(img: HTMLImageElement): string {
   const parent = img.parentElement;
   if (parent?.tagName === 'A') {
      const href = parent.getAttribute('href');
      if (href) {
         try {
            const base = img.ownerDocument.baseURI || undefined;
            const url = new URL(href, base);
            const isWeb = url.protocol === 'http:' || url.protocol === 'https:';
            if (isWeb && IMAGE_PATH.test(url.pathname)) return url.href;
         } catch {
            // An unparsable href is not an image address.
         }
      }
   }
   return img.src;
}

function cleanClone(table: HTMLTableElement): HTMLTableElement {
   const clone = table.cloneNode(true) as HTMLTableElement;
   for (const button of Array.from(clone.querySelectorAll('[data-rich-open]'))) button.remove();
   for (const el of Array.from(clone.querySelectorAll('[data-rich-zoom], [data-rich-scroll]'))) {
      el.replaceWith(...Array.from(el.childNodes));
   }
   return clone;
}

export function readZoomTarget(button: HTMLElement): ZoomTarget | null {
   const wrapper = button.closest('[data-rich-zoom]');
   if (!wrapper) return null;

   if (wrapper.getAttribute(ZOOM_ATTR) === 'table') {
      const table = wrapper.querySelector('table');
      return table ? { kind: 'table', table: cleanClone(table) } : null;
   }

   const img = wrapper.querySelector('img');
   return img ? { kind: 'image', src: resolveImageSrc(img), alt: img.alt } : null;
}
