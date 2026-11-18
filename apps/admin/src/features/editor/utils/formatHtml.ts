const BLOCK_TAGS = new Set([
   'p',
   'h1',
   'h2',
   'h3',
   'h4',
   'h5',
   'h6',
   'ul',
   'ol',
   'li',
   'blockquote',
   'table',
   'thead',
   'tbody',
   'tfoot',
   'tr',
   'th',
   'td',
   'colgroup',
   'col',
   'pre',
]);
const VOID_BLOCK_TAGS = new Set(['col']);
const INDENT = '   ';

const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(?:\s(?:[^>"']|"[^"]*"|'[^']*')*)?>/y;

type OpenBlock = {
   name: string;
   expanded: boolean;
};

const createWriter = () => {
   const lines: string[] = [];
   const stack: OpenBlock[] = [];
   let depth = 0;
   let current = '';
   let currentDepth = 0;

   const flush = () => {
      if (current) lines.push(INDENT.repeat(currentDepth) + current);
      current = '';
   };

   const setLine = (text: string) => {
      current = text;
      currentDepth = depth;
   };

   const inline = (raw: string) => {
      if (!current) {
         if (!raw.trim()) return;
         currentDepth = depth;
      }
      current += raw;
   };

   const startChild = () => {
      const parent = stack.at(-1);
      const expand = Boolean(current && parent && !parent.expanded);
      flush();
      if (parent && expand) {
         parent.expanded = true;
         depth += 1;
      }
   };

   const wholeLine = (text: string) => {
      startChild();
      setLine(text);
      flush();
   };

   const open = (raw: string, name: string) => {
      startChild();
      setLine(raw);
      stack.push({ name, expanded: false });
   };

   const close = (raw: string, name: string) => {
      const index = stack.map((block) => block.name).lastIndexOf(name);
      if (index === -1) {
         inline(raw);
         return;
      }
      while (stack.length - 1 > index) {
         if (stack.pop()?.expanded) depth -= 1;
      }
      if (stack.pop()?.expanded) {
         flush();
         depth -= 1;
         setLine(raw);
      } else {
         current += raw;
      }
      flush();
   };

   const result = () => {
      flush();
      return lines.join('\n');
   };

   return { inline, open, close, wholeLine, result };
};

type Writer = ReturnType<typeof createWriter>;

const writeTag = (writer: Writer, html: string, match: RegExpExecArray, after: number): number => {
   const [raw, slash, tag] = match;
   const name = tag.toLowerCase();

   if (!BLOCK_TAGS.has(name)) {
      writer.inline(raw);
   } else if (slash) {
      writer.close(raw, name);
   } else if (name === 'pre') {
      const end = html.toLowerCase().indexOf('</pre>', after);
      const stop = end === -1 ? html.length : end + '</pre>'.length;
      writer.wholeLine(raw + html.slice(after, stop));
      return stop;
   } else if (VOID_BLOCK_TAGS.has(name) || raw.endsWith('/>')) {
      writer.wholeLine(raw);
   } else {
      writer.open(raw, name);
   }
   return after;
};

export const formatHtml = (html: string): string => {
   const writer = createWriter();
   let position = 0;

   while (position < html.length) {
      TAG.lastIndex = position;
      const match = html[position] === '<' ? TAG.exec(html) : null;

      if (match) {
         position = writeTag(writer, html, match, position + match[0].length);
      } else {
         const next = html.indexOf('<', position + 1);
         const end = next === -1 ? html.length : next;
         writer.inline(html.slice(position, end));
         position = end;
      }
   }

   return writer.result();
};
