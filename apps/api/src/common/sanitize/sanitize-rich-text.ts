import sanitizeHtml from 'sanitize-html';

export const ALLOWED_TAGS = [
   'p',
   'br',
   'strong',
   'em',
   'u',
   's',
   'h1',
   'h2',
   'h3',
   'h4',
   'h5',
   'h6',
   'blockquote',
   'ul',
   'ol',
   'li',
   'a',
   'img',
   'code',
   'pre',
   'table',
   'thead',
   'tbody',
   'tfoot',
   'tr',
   'th',
   'td',
   'colgroup',
   'col',
];

export const RICH_TEXT_HTML_HINT =
   `Allowed HTML tags: ${ALLOWED_TAGS.map((tag) => `<${tag}>`).join(' ')}; any other tag is removed. ` +
   'A table needs a header row (<thead> with <th> cells) and a <tbody> for the other rows; ' +
   '<th> and <td> accept colspan and rowspan. ' +
   'Use <h2> and <h3> for headings (the page title is the <h1>); a table has no <caption>.';

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
   a: ['href', 'title', 'target', 'rel'],
   img: ['src', 'alt', 'title', 'width', 'height'],
   th: ['colspan', 'rowspan'],
   td: ['colspan', 'rowspan'],
   col: ['span'],
};

const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const ALLOWED_SCHEMES_BY_TAG: Record<string, string[]> = {
   img: ['http', 'https', 'data'],
};

const SPAN_PATTERN = /^\d{1,4}$/;
const MAX_COLSPAN = 1000;

const boundSpan = (value: string | undefined, max = Infinity): string | undefined => {
   if (value === undefined || !SPAN_PATTERN.test(value)) return undefined;
   const span = Number(value);
   return span === 0 ? undefined : String(Math.min(span, max));
};

const transformCell: sanitizeHtml.Transformer = (tagName, attribs) => {
   const { colspan, rowspan, ...rest } = attribs;
   const boundColspan = boundSpan(colspan, MAX_COLSPAN);
   const boundRowspan = boundSpan(rowspan);
   return {
      tagName,
      attribs: {
         ...rest,
         ...(boundColspan !== undefined ? { colspan: boundColspan } : {}),
         ...(boundRowspan !== undefined ? { rowspan: boundRowspan } : {}),
      },
   };
};

export function sanitizeRichText(input: string | null | undefined): string | null {
   if (input === null || input === undefined) return null;
   if (input === '') return '';
   return sanitizeHtml(input, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRIBUTES,
      allowedSchemes: ALLOWED_SCHEMES,
      allowedSchemesByTag: ALLOWED_SCHEMES_BY_TAG,
      selfClosing: [...sanitizeHtml.defaults.selfClosing, 'col'],
      transformTags: {
         a: (tagName, attribs) => {
            const { target, ...rest } = attribs;
            return {
               tagName,
               attribs: {
                  ...rest,
                  ...(target === '_blank' ? { target } : {}),
                  rel: 'noopener noreferrer',
               },
            };
         },
         th: transformCell,
         td: transformCell,
      },
   });
}
