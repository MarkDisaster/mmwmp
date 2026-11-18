import Image from '@tiptap/extension-image';
import { NodeSelection } from '@tiptap/pm/state';
import { Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { afterEach, describe, expect, it } from 'vitest';

import type { FileEntity } from '@/api/generated';

import { imageContentFromFile, insertImageContent } from '../utils/imageContent';

const ORIGINAL_URL = 'https://cdn.test/original.png';

const makeFile = (overrides: Partial<Record<string, unknown>> = {}) =>
   ({
      originalName: 'photo.png',
      displayName: null,
      altText: 'A cat',
      mimeType: 'image/png',
      publicUrl: ORIGINAL_URL,
      variants: [{ variant: 'medium', publicUrl: 'https://cdn.test/medium.webp' }],
      ...overrides,
   }) as unknown as FileEntity;

let editor: Editor | undefined;

const createEditor = () => {
   editor = new Editor({
      extensions: [
         StarterKit.configure({ heading: false, link: { openOnClick: false } }),
         Image.configure({ inline: true }),
      ],
      content: '<p></p>',
   });
   return editor;
};

afterEach(() => {
   editor?.destroy();
   editor = undefined;
});

describe('imageContentFromFile in the editor', () => {
   it('should insert as <p><a href target=_blank rel=noopener noreferrer><img src alt></a></p>', () => {
      const ed = createEditor();

      ed.commands.insertContent(imageContentFromFile(makeFile()));

      const html = ed.getHTML();
      expect(html).toContain(`href="${ORIGINAL_URL}"`);
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toMatch(/<a [^>]*><img [^>]*src="https:\/\/cdn\.test\/medium\.webp"/);
      expect(html).toContain('alt="A cat"');
      expect(html).toMatch(/^<p><a /);
   });

   it('should read <a><img></a> back as an image with a link mark', () => {
      const ed = createEditor();

      ed.commands.setContent(
         `<p><a href="${ORIGINAL_URL}"><img src="https://cdn.test/m.webp" alt="x"></a></p>`,
      );

      const image = ed.getJSON().content?.[0].content?.[0];
      expect(image?.type).toBe('image');
      expect(image?.marks?.map((mark) => mark.type)).toEqual(['link']);
      expect(image?.marks?.[0].attrs?.href).toBe(ORIGINAL_URL);
   });

   it('should keep a link around text as a link mark', () => {
      const ed = createEditor();

      ed.commands.setContent(`<p><a href="${ORIGINAL_URL}">text</a></p>`);

      const node = ed.getJSON().content?.[0].content?.[0];
      expect(node?.type).toBe('text');
      expect(node?.marks?.[0].type).toBe('link');
      expect(JSON.stringify(ed.getJSON())).not.toContain('"image"');
   });

   it('should not insert a javascript href', () => {
      const ed = createEditor();

      ed.commands.insertContent(
         imageContentFromFile(makeFile({ publicUrl: 'javascript:alert(1)' })),
      );

      expect(ed.getHTML()).not.toContain('javascript:');
      expect(ed.getHTML()).not.toContain('<a ');
   });
});

describe('insertImageContent', () => {
   const imageCount = (html: string) => (html.match(/<img /g) ?? []).length;

   it('should keep a selected image and put the new one after it', () => {
      const ed = createEditor();
      ed.commands.insertContent(imageContentFromFile(makeFile({ altText: 'first' })));
      ed.view.dispatch(ed.state.tr.setSelection(NodeSelection.create(ed.state.doc, 1)));

      insertImageContent(ed, imageContentFromFile(makeFile({ altText: 'second' })));

      const html = ed.getHTML();
      expect(imageCount(html)).toBe(2);
      expect(html.indexOf('alt="first"')).toBeLessThan(html.indexOf('alt="second"'));
   });

   it('should insert at the given position', () => {
      const ed = createEditor();
      ed.commands.insertContent(imageContentFromFile(makeFile({ altText: 'first' })));

      insertImageContent(ed, imageContentFromFile(makeFile({ altText: 'second' })), 0);

      const html = ed.getHTML();
      expect(imageCount(html)).toBe(2);
      expect(html.indexOf('alt="second"')).toBeLessThan(html.indexOf('alt="first"'));
   });
});
