import { describe, expect, it } from 'vitest';

import { extFromMimeType, pickVoice, toSpeechLocale, toSpokenText } from '../utils/speech';

describe('toSpeechLocale', () => {
   it('should map the admin languages to their speech locales', () => {
      expect(toSpeechLocale('cs')).toBe('cs-CZ');
      expect(toSpeechLocale('en')).toBe('en-US');
      expect(toSpeechLocale('en-GB')).toBe('en-US');
   });

   it('should fall back to Czech for a missing or unknown language', () => {
      expect(toSpeechLocale(undefined)).toBe('cs-CZ');
      expect(toSpeechLocale('de')).toBe('cs-CZ');
   });
});

describe('extFromMimeType', () => {
   it('should take the subtype without codec parameters', () => {
      expect(extFromMimeType('audio/webm;codecs=opus')).toBe('webm');
      expect(extFromMimeType('audio/mp4')).toBe('mp4');
      expect(extFromMimeType('audio/mpeg')).toBe('mpeg');
   });

   it('should fall back to webm without a subtype', () => {
      expect(extFromMimeType('')).toBe('webm');
      expect(extFromMimeType('audio')).toBe('webm');
      expect(extFromMimeType('audio/')).toBe('webm');
   });
});

describe('pickVoice', () => {
   const zuzana = { lang: 'cs-CZ', name: 'Zuzana' };
   const czech = { lang: 'cs', name: 'Czech' };
   const samantha = { lang: 'en-US', name: 'Samantha' };

   it('should prefer the exact locale over the same language', () => {
      expect(pickVoice([czech, zuzana, samantha], 'cs-CZ')).toBe(zuzana);
   });

   it('should fall back to a voice of the same language', () => {
      expect(pickVoice([samantha, czech], 'cs-CZ')).toBe(czech);
   });

   it('should return null without a voice of the language', () => {
      expect(pickVoice([samantha], 'cs-CZ')).toBeNull();
      expect(pickVoice([], 'en-US')).toBeNull();
   });
});

describe('toSpokenText', () => {
   it('should read link and image texts without their targets', () => {
      expect(toSpokenText('Otevírám [Selltoro](/projects/12) a ![logo](https://x.cz/l.png).')).toBe(
         'Otevírám Selltoro a logo.',
      );
   });

   it('should drop the Markdown markers but keep the words', () => {
      expect(
         toSpokenText('## Projekty\n- **Selltoro** (id 12)\n1. *Vinisto* a `audit_logs`\n> citace'),
      ).toBe('Projekty\nSelltoro (id 12)\nVinisto a audit_logs\ncitace');
   });

   it('should keep plain text as it is', () => {
      expect(toSpokenText('Hotovo. Tři soubory, 4 * 5 = 20.')).toBe(
         'Hotovo. Tři soubory, 4 * 5 = 20.',
      );
   });
});
