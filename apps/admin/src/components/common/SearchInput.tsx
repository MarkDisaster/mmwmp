import { cn } from '@mm/utils/cn';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';

type SearchInputProps = {
   value: string;
   onChange: (value: string) => void;
   placeholder?: string;
   className?: string;
};

export const SearchInput = ({
   value,
   onChange,
   placeholder,
   className = 'w-64',
}: SearchInputProps) => {
   const { t } = useTranslation();
   const label = placeholder ?? t('common.search');

   return (
      <div className="relative">
         <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
         <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={label}
            aria-label={label}
            className={cn('pl-9', className)}
         />
         {value && (
            <button
               type="button"
               aria-label={t('common.clearSearch')}
               onClick={() => onChange('')}
               className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
               <X className="h-4 w-4" />
            </button>
         )}
      </div>
   );
};
