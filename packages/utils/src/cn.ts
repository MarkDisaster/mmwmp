import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

export const CUSTOM_FONT_SIZES = [
   'display',
   'title',
   'heading',
   'subheading',
   'minor',
   'contact',
] as const;

const twMerge = extendTailwindMerge({ extend: { theme: { text: [...CUSTOM_FONT_SIZES] } } });

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
}
