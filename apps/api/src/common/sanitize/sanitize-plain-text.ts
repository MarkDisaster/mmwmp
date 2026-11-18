import sanitizeHtml from 'sanitize-html';

const ENTITIES: Record<string, string> = {
   '&amp;': '&',
   '&lt;': '<',
   '&gt;': '>',
   '&quot;': '"',
};

export function sanitizePlainText(input: string | null | undefined): string | null {
   if (input === null || input === undefined) return null;
   const stripped = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} })
      .replace(/&(?:amp|lt|gt|quot);/g, (entity) => ENTITIES[entity] ?? entity)
      .trim();
   return stripped === '' ? null : stripped;
}
