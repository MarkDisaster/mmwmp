import type { ReactNode } from 'react';

import ArrowRightSvg from '@/assets/icons/arrow-right.svg';
import { Link } from '@/i18n/navigation';

type BackLinkProps = {
   href: string;
   children: ReactNode;
};

export function BackLink({ href, children }: BackLinkProps) {
   return (
      <div className="pt-12.5 pb-10">
         <Link
            href={href}
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground uppercase no-underline transition-colors duration-400 hover:text-brand hover:no-underline"
         >
            <ArrowRightSvg aria-hidden className="size-4 rotate-180" />
            {children}
         </Link>
      </div>
   );
}
