import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MarkdownManager } from '@tiptap/markdown';
import { describe, expect, it, vi } from 'vitest';

import { QueryWrapper } from '@/test/QueryWrapper';

import { TextEditor } from '../components/TextEditor';

vi.mock('@/features/files/hooks/useUploadFile', () => ({
   useUploadFile: () => ({ mutateAsync: vi.fn() }),
}));

Range.prototype.getClientRects ??= () =>
   Object.assign([], { item: () => null }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect ??= () => ({
   x: 0,
   y: 0,
   width: 0,
   height: 0,
   top: 0,
   right: 0,
   bottom: 0,
   left: 0,
   toJSON: () => ({}),
});

const CASE_STUDY_TABLE = [
   '| | Cena | Hodí se jako osobní AI asistent? | Má agent vlastní trvalou konverzaci? | Tým s vedoucím | Ptá se agent před akcí? | Je agent oddělený od počítače? | Učí se, a kdo to schvaluje? | Kde se ovládá | Běží na předplatném Claude? |',
   '|---|---|---|---|---|---|---|---|---|---|',
   '| **OpenClaw** | zdarma (open source), platíte jen model | ✅ ano, osobní asistent v chatovacích aplikacích | ✅ ano, každý agent má vlastní složku a popis osobnosti | ✅ ano, koordinátor a specialisté | ⚠️ jen u příkazů v terminálu, ve výchozím stavu vypnuto | ⚠️ lze zapnout kontejner, ve výchozím stavu běží přímo na počítači; přístup na internet neomezuje | ⚠️ ano, poznatky si ukládá sám bez schválení | web, terminál, chatovací aplikace | ✅ ano |',
   '| **AURORA** | zdarma (vlastní projekt), platíte jen předplatné Claude | ✅ ano, jeden asistent nad týmy, vaultem a domácností | ✅ ano, napříč projekty, konverzace lze připnout | ✅ ano | ✅ ano, u každé akce (příkazy, soubory, napojené služby); pro každou lze nastavit povolit / zeptat se / zakázat | ✅ ano, ve výchozím stavu oddělené prostředí; lze zapnout kontejner, kam firewall pustí jen potřebné weby | ✅ navrhne lekci, ověří ji na starých úkolech, člověk ji schválí; lze přepnout na automatiku | web a Telegram | ✅ ano |',
].join('\n');

const renderEditor = async () => {
   const onChange = vi.fn();
   render(<TextEditor content="<p></p>" onChange={onChange} />, { wrapper: QueryWrapper });
   await screen.findByRole('button', { name: 'Bold' });
   return onChange;
};

const getContentElement = () => {
   const element = document.querySelector('.ProseMirror');
   if (!element) throw new Error('The editor content is not rendered');
   return element;
};

const paste = (data: Record<string, string>) => {
   const event = new Event('paste', { bubbles: true, cancelable: true });
   Object.defineProperty(event, 'clipboardData', {
      value: {
         getData: (type: string) => data[type] ?? '',
         types: Object.keys(data),
         files: [],
         items: [],
      },
   });
   fireEvent(getContentElement(), event);
};

const lastHtml = async (onChange: ReturnType<typeof vi.fn>) => {
   await waitFor(() => expect(onChange).toHaveBeenCalled());
   return onChange.mock.calls.at(-1)?.[0] as string;
};

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

describe('TextEditor markdown paste', () => {
   it('should turn a pasted markdown table into a table', async () => {
      const onChange = await renderEditor();

      paste({ 'text/plain': CASE_STUDY_TABLE });

      const body = parse(await lastHtml(onChange));
      expect(body.querySelectorAll('table')).toHaveLength(1);
      expect(body.querySelectorAll('tr:first-child th')).toHaveLength(10);
      const rows = body.querySelectorAll('tr');
      expect(rows).toHaveLength(3);
      expect(rows[1]?.querySelector('td:first-child strong')?.textContent).toBe('OpenClaw');
      expect(rows[2]?.querySelector('td:first-child strong')?.textContent).toBe('AURORA');
   });

   it('should map markdown headings to h2 and h3', async () => {
      const onChange = await renderEditor();

      paste({ 'text/plain': '# Title\n\n## Part\n\n### Detail' });

      const body = parse(await lastHtml(onChange));
      expect(body.querySelectorAll('h1')).toHaveLength(0);
      expect(body.querySelectorAll('h2')).toHaveLength(2);
      expect(body.querySelectorAll('h3')).toHaveLength(1);
   });

   it('should turn a pasted markdown list into a list', async () => {
      const onChange = await renderEditor();

      paste({ 'text/plain': '- a\n- b' });

      const body = parse(await lastHtml(onChange));
      expect(body.querySelectorAll('ul')).toHaveLength(1);
      expect(body.querySelectorAll('ul li')).toHaveLength(2);
   });

   it('should keep a single line break of pasted markdown as a hard break', async () => {
      const onChange = await renderEditor();

      paste({ 'text/plain': '**Name:** John\n**Email:** a@b.cz\nThird line' });

      const html = await lastHtml(onChange);
      expect(parse(html).querySelectorAll('p br')).toHaveLength(2);
      expect(html).not.toContain('\n');
      expect(parse(html).querySelector('p')?.textContent).toBe(
         'Name: John' + 'Email: a@b.cz' + 'Third line',
      );
   });

   it('should keep the hard break when the saved HTML is loaded again', async () => {
      const onChange = await renderEditor();
      paste({ 'text/plain': '**Name:** John\n**Email:** a@b.cz' });
      const html = await lastHtml(onChange);

      const second = vi.fn();
      document.body.innerHTML = '';
      render(<TextEditor content={html} onChange={second} />, { wrapper: QueryWrapper });
      await screen.findByRole('button', { name: 'Bold' });

      expect(getContentElement().querySelectorAll('p br')).toHaveLength(1);
   });

   it('should insert pasted HTML as HTML and not convert its plain text flavour', async () => {
      const onChange = await renderEditor();

      paste({ 'text/html': '<p>x</p>', 'text/plain': '# Heading' });

      const body = parse(await lastHtml(onChange));
      expect(body.querySelectorAll('h1, h2, h3')).toHaveLength(0);
      expect(body.querySelector('p')?.textContent).toBe('x');
   });

   it('should keep a pasted plain sentence as text', async () => {
      const onChange = await renderEditor();

      paste({ 'text/plain': 'Plain sentence.' });

      const body = parse(await lastHtml(onChange));
      expect(body.querySelector('p')?.textContent).toBe('Plain sentence.');
      expect(body.querySelectorAll('table, ul, h2')).toHaveLength(0);
   });

   it('should paste markdown as plain text on a shift paste', async () => {
      const onChange = await renderEditor();

      fireEvent.keyDown(getContentElement(), { key: 'Shift', shiftKey: true });
      paste({ 'text/plain': CASE_STUDY_TABLE });

      const body = parse(await lastHtml(onChange));
      expect(body.querySelectorAll('table')).toHaveLength(0);
      expect(body.textContent).toContain('OpenClaw');
   });

   it('should fall back to the default text paste when the markdown cannot be parsed', async () => {
      const onChange = await renderEditor();
      const parseSpy = vi.spyOn(MarkdownManager.prototype, 'parse').mockImplementation(() => {
         throw new Error('parse failed');
      });

      try {
         paste({ 'text/plain': '## Part' });
         const body = parse(await lastHtml(onChange));
         expect(parseSpy).toHaveBeenCalled();
         expect(body.querySelectorAll('h2')).toHaveLength(0);
         expect(body.textContent).toContain('## Part');
      } finally {
         parseSpy.mockRestore();
      }
   });
});
