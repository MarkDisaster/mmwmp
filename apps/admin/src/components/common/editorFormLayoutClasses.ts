import { cn } from '@mm/utils/cn';

export const EDITOR_FORM_HEADER_CLASS = 'z-20 bg-white py-3 md:sticky md:-top-4';

export const editorFormGridClass = (hasSidebar: boolean) =>
   cn('grid grid-cols-1 gap-10', hasSidebar ? '@4xl:grid-cols-[minmax(0,1fr)_22rem]' : 'max-w-2xl');
