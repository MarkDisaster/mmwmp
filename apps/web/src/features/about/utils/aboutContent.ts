type ContactTranslations = {
   translations?: { language: string; aboutTitle?: string | null; description?: string | null }[];
};

export const getAboutContent = (
   contact: ContactTranslations | null | undefined,
   locale: string,
): { title: string | null; description: string | null } => {
   const translation = contact?.translations?.find((tr) => tr.language === locale);

   return {
      title: translation?.aboutTitle || null,
      description: translation?.description ?? null,
   };
};
