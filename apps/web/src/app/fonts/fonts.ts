/* eslint-disable sonarjs/no-duplicate-string */
import { cn } from '@mm/utils/cn';
import localFont from 'next/font/local';

const montserratLatin = localFont({
   src: './Montserrat-latin.woff2',
   weight: '100 900',
   style: 'normal',
   variable: '--font-montserrat-latin',
   declarations: [
      {
         prop: 'unicode-range',
         value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      },
   ],
   adjustFontFallback: false,
});

const montserratLatinExt = localFont({
   src: './Montserrat-latin-ext.woff2',
   weight: '100 900',
   style: 'normal',
   variable: '--font-montserrat-latin-ext',
   declarations: [
      {
         prop: 'unicode-range',
         value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
      },
   ],
   preload: false,
});

const interLatin = localFont({
   src: [
      { path: './Inter-latin.woff2', weight: '400 700', style: 'normal' },
      { path: './Inter-Italic.woff2', weight: '400 700', style: 'italic' },
   ],
   variable: '--font-inter',
   declarations: [
      {
         prop: 'unicode-range',
         value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
      },
   ],
});

const interLatinExt = localFont({
   src: [
      { path: './Inter-latin-ext.woff2', weight: '400 700', style: 'normal' },
      { path: './Inter-Italic-latin-ext.woff2', weight: '400 700', style: 'italic' },
   ],
   variable: '--font-inter-latin-ext',
   declarations: [
      {
         prop: 'unicode-range',
         value: 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
      },
   ],
   preload: false,
   adjustFontFallback: false,
});

export const fontVariables = cn(
   montserratLatin.variable,
   montserratLatinExt.variable,
   interLatin.variable,
   interLatinExt.variable,
);
