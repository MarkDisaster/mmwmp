import { cn } from '@mm/utils/cn';
import { Link } from '@tanstack/react-router';

import { useNavItems } from '@/features/layout/hooks/useNavItems';

type Props = {
   className?: string;
   onNavigate?: () => void;
};

export const NavLinks = ({ className, onNavigate }: Props) => {
   const navItems = useNavItems();

   return (
      <nav className={cn('mt-4 flex-1 space-y-1', className)}>
         {navItems.map((item) => (
            <Link
               key={item.to}
               to={item.to}
               onClick={onNavigate}
               activeOptions={{ exact: item.to === '/' }}
               className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-300"
               activeProps={{ className: 'bg-card text-primary shadow-sm' }}
               inactiveProps={{ className: 'text-muted-foreground hover:text-link-hover' }}
            >
               {item.icon}
               {item.label}
            </Link>
         ))}
      </nav>
   );
};
