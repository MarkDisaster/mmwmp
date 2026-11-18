import { cn, CUSTOM_FONT_SIZES } from '@mm/utils/cn';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const COLOUR = 'text-foreground';
const TEXT_TITLE = 'text-title';

describe('cn', () => {
   it('should keep a custom font size next to a text colour', () => {
      expect(cn('text-heading md:text-contact', COLOUR)).toBe(
         `text-heading md:text-contact ${COLOUR}`,
      );
      expect(cn(`${TEXT_TITLE} md:text-display`, COLOUR)).toBe(
         `${TEXT_TITLE} md:text-display ${COLOUR}`,
      );
   });

   it('should let a later size replace an earlier one and a later colour a colour', () => {
      expect(cn('text-heading', TEXT_TITLE)).toBe(TEXT_TITLE);
      expect(cn(COLOUR, 'text-brand')).toBe('text-brand');
   });

   it('should merge a custom size with a Tailwind size', () => {
      expect(cn(TEXT_TITLE, 'text-lg')).toBe('text-lg');
      expect(cn('text-sm', 'text-lg')).toBe('text-lg');
   });

   it('should keep the responsive size beside the base size', () => {
      expect(cn('text-heading', 'md:text-contact')).toBe('text-heading md:text-contact');
   });
});

describe('CUSTOM_FONT_SIZES', () => {
   it('should list every --text-* of globals.css', () => {
      const css = readFileSync(join(__dirname, '../../app/globals.css'), 'utf8');
      const declared = [...css.matchAll(/^\s*--text-([a-z0-9-]+)\s*:/gm)].map(([, name]) => name);

      expect(declared.length).toBeGreaterThan(0);
      expect([...CUSTOM_FONT_SIZES].sort()).toEqual([...new Set(declared)].sort());
   });
});
