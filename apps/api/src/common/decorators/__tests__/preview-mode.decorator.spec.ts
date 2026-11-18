import { isPreviewTokenAccepted } from '../preview-mode.decorator';

const API_TOKEN = 'api-token-of-at-least-32-characters-long';
const LEGACY = 'legacy-preview-secret';

describe('isPreviewTokenAccepted', () => {
   it('accepts PREVIEW_API_TOKEN', () => {
      expect(isPreviewTokenAccepted(API_TOKEN, [API_TOKEN, undefined])).toBe(true);
   });

   it('accepts the legacy PREVIEW_SECRET while it is set, next to the new token', () => {
      expect(isPreviewTokenAccepted(LEGACY, [API_TOKEN, LEGACY])).toBe(true);
      expect(isPreviewTokenAccepted(LEGACY, [undefined, LEGACY])).toBe(true);
   });

   it('refuses the legacy secret once it is unset', () => {
      expect(isPreviewTokenAccepted(LEGACY, [API_TOKEN, undefined])).toBe(false);
   });

   it('refuses a wrong token, a prefix and a longer value without throwing', () => {
      expect(isPreviewTokenAccepted('wrong', [API_TOKEN, LEGACY])).toBe(false);
      expect(isPreviewTokenAccepted(API_TOKEN.slice(0, -1), [API_TOKEN])).toBe(false);
      expect(isPreviewTokenAccepted(`${API_TOKEN}x`, [API_TOKEN])).toBe(false);
   });

   it('matches nothing when no token is configured, not even an empty one', () => {
      expect(isPreviewTokenAccepted('', [undefined, undefined])).toBe(false);
      expect(isPreviewTokenAccepted('', ['', ''])).toBe(false);
   });
});
