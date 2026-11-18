export const names = (cs: string, en?: string) => ({
   create: [
      { language: 'cs' as const, name: cs },
      ...(en === undefined ? [] : [{ language: 'en' as const, name: en }]),
   ],
});

export const tagBody = (slug: string, cs: string, en?: string) => ({
   slug,
   translations: [
      { language: 'cs', name: cs },
      ...(en === undefined ? [] : [{ language: 'en', name: en }]),
   ],
});
