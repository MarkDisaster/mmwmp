import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { HeroFrame } from '../components/HeroFrame';
import { HeroSection } from '../components/HeroSection';

vi.mock('next-intl', () => ({
   useTranslations: () => (key: string) => key,
}));
vi.mock('@/features/runner-game/components/RunnerGame', () => ({ RunnerGame: () => null }));
vi.mock('@/components/common/Button', () => ({
   Button: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/i18n/navigation', () => ({ Link: () => null }));
vi.mock('@/assets/icons/arrow-right.svg', () => ({ default: () => null }));

function count(html: string, tag: string) {
   return (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
}

describe('home hero headings', () => {
   it('HeroSection renders exactly one h1 and no h2', () => {
      const html = renderToStaticMarkup(createElement(HeroSection));
      expect(count(html, 'h1')).toBe(1);
      expect(count(html, 'h2')).toBe(0);
   });

   it('HeroFrame renders exactly one h1 and no h2, with the full text', () => {
      const html = renderToStaticMarkup(
         createElement(HeroFrame, {
            top1: 'Marek',
            top2: 'Marek',
            bottom1: 'software',
            bottom2: 'developer',
            cta: null,
         }),
      );
      expect(count(html, 'h1')).toBe(1);
      expect(count(html, 'h2')).toBe(0);
      expect(html).toContain('>Marek Marek software developer</h1>');
   });
});
