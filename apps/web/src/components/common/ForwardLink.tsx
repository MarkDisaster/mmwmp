import type { ReactNode } from 'react';

import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Link } from '@/i18n/navigation';

type ForwardLinkProps = {
   href: string;
   children: ReactNode;
};

export function ForwardLink({ href, children }: ForwardLinkProps) {
   return (
      <Link
         href={href}
         className="inline-flex items-center gap-2 text-sm font-semibold text-foreground uppercase no-underline transition-colors duration-400 hover:text-brand hover:no-underline"
      >
         {children}
         <ArrowRightSvg aria-hidden className="size-4" />
      </Link>
   );
}
