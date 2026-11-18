import type { KeyboardEvent } from 'react';

export const onActivateKey =
   (handler: () => void) =>
   (e: KeyboardEvent<HTMLElement>): void => {
      if (e.key === 'Enter' || e.key === ' ') {
         e.preventDefault();
         handler();
      }
   };
