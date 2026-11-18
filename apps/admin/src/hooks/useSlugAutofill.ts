import { useState } from 'react';

import { convertToSlug } from '@/utils/slug';

export const useSlugAutofill = (initiallyLocked: boolean, setSlug: (slug: string) => void) => {
   const [isLocked, setIsLocked] = useState(initiallyLocked);
   const [isManual, setIsManual] = useState(false);

   return {
      isLocked,
      toggleLock: () => setIsLocked((locked) => !locked),
      markManual: () => setIsManual(true),
      fillFromTitle: (title: string) => {
         if (!isLocked && !isManual) setSlug(convertToSlug(title));
      },
   };
};

export type SlugAutofill = ReturnType<typeof useSlugAutofill>;
