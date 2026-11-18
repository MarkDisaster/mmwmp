import { cn } from '@mm/utils/cn';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { linkOptionsOf, resolveAdminHref } from '@/features/ai-chat/utils/adminNavigation';
import { useResponsive } from '@/hooks/useResponsive';

const EXTERNAL_PROTOCOLS: ReadonlySet<string> = new Set(['http:', 'https:', 'mailto:']);

const toExternalHref = (href: string, origin: string): string | null => {
   try {
      const url = new URL(href);
      if (url.origin === origin) return null;
      return EXTERNAL_PROTOCOLS.has(url.protocol) ? url.href : null;
   } catch {
      return null;
   }
};

type Props = {
   href: string | undefined;
   children: ReactNode;
   className?: string;
};

export const AiChatLink = ({ href, children, className }: Props) => {
   const revealPage = useAiChatStore((s) => s.revealPage);
   const { isMobile } = useResponsive();
   const linkClassName = cn('underline underline-offset-2 hover:opacity-80', className);

   if (!href) return <>{children}</>;

   const { origin } = window.location;
   const target = resolveAdminHref(href, origin);
   if (target) {
      return (
         <Link
            {...linkOptionsOf(target)}
            className={linkClassName}
            onClick={() => revealPage(isMobile)}
         >
            {children}
         </Link>
      );
   }

   const external = toExternalHref(href, origin);
   if (external) {
      return (
         <a href={external} target="_blank" rel="noopener noreferrer" className={linkClassName}>
            {children}
         </a>
      );
   }

   return <>{children}</>;
};
