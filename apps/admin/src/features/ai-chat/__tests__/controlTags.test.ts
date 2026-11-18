import { describe, expect, it } from 'vitest';

import {
   AUTO_EDIT_TAG,
   buildUserMessageText,
   stripControlTags,
   VOICE_TAG,
} from '../utils/controlTags';

const files = [
   { fileId: 12, name: 'hero.png' },
   { fileId: 13, name: 'brief (final).pdf' },
];

describe('buildUserMessageText', () => {
   it('should return the text alone without files or flags', () => {
      expect(
         buildUserMessageText({ text: 'Ahoj', files: [], fromVoice: false, autoEdit: false }),
      ).toBe('Ahoj');
   });

   it('should append the attachment note, then the voice and auto-edit tags', () => {
      expect(
         buildUserMessageText({ text: 'Přidej je', files, fromVoice: true, autoEdit: true }),
      ).toBe(
         `Přidej je\n\n[Přílohy: fileId=12 (hero.png), fileId=13 (brief (final).pdf)] ${VOICE_TAG} ${AUTO_EDIT_TAG}`,
      );
   });
});

describe('stripControlTags', () => {
   it('should give back the typed text for every combination of files and flags', () => {
      for (const withFiles of [false, true]) {
         for (const fromVoice of [false, true]) {
            for (const autoEdit of [false, true]) {
               const text = buildUserMessageText({
                  text: 'Nahraj obrázek',
                  files: withFiles ? files : [],
                  fromVoice,
                  autoEdit,
               });
               expect(stripControlTags(text)).toBe('Nahraj obrázek');
            }
         }
      }
   });

   it('should leave nothing of a message that carries only attachments', () => {
      const text = buildUserMessageText({ text: '', files, fromVoice: false, autoEdit: true });
      expect(stripControlTags(text)).toBe('');
   });

   it('should strip the tags in either order', () => {
      expect(stripControlTags(`Hotovo ${AUTO_EDIT_TAG} ${VOICE_TAG}`)).toBe('Hotovo');
   });

   it('should keep tags and notes that are not at the end of the text', () => {
      const text = `Co znamená ${VOICE_TAG} a [Přílohy: x] ve zprávě?`;
      expect(stripControlTags(text)).toBe(text);
   });

   it('should keep a multi-line text intact', () => {
      expect(stripControlTags(`První řádek\nDruhý řádek ${VOICE_TAG}`)).toBe(
         'První řádek\nDruhý řádek',
      );
   });
});
