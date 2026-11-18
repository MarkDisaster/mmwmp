export const toSpeechLocale = (language: string | undefined) =>
   language?.toLowerCase().startsWith('en') ? 'en-US' : 'cs-CZ';

export const extFromMimeType = (mimeType: string) => {
   const subtype = mimeType.split(';')[0]?.split('/')[1]?.trim();
   return subtype || 'webm';
};

export const pickVoice = <T extends Pick<SpeechSynthesisVoice, 'lang'>>(
   voices: readonly T[],
   locale: string,
): T | null => {
   const language = locale.split('-')[0] ?? locale;
   return (
      voices.find((v) => v.lang === locale) ??
      voices.find((v) => v.lang.startsWith(language)) ??
      null
   );
};

export const toSpokenText = (markdown: string) =>
   markdown
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/```[^\n]*\n?/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/(\*\*|__)(.+?)\1/g, '$2')
      .replace(/\*(\S(?:.*?\S)?)\*/g, '$1')
      .replace(/^ {0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+/gm, '')
      .trim();
