import { cn } from '@mm/utils/cn';

import { Link } from '@/i18n/navigation';

type SectionHeaderProps = {
   href: string;
   title: string;
   isPageTitle?: boolean;
};

export function SectionHeader({ href, title, isPageTitle = false }: SectionHeaderProps) {
   const Element = isPageTitle ? 'h1' : 'header';

   return (
      <Element
         className={cn(
            'mb-15 flex items-center',
            isPageTitle && 'font-body text-lg leading-normal font-normal',
         )}
      >
         /
         <Link
            href={href}
            className="ml-5 text-base font-semibold text-foreground uppercase no-underline hover:no-underline"
         >
            {title}
         </Link>
      </Element>
   );
}
