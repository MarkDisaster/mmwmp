import { LayoutGrid, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ViewMode } from '@/store/viewModeStore';

type ViewToggleProps = {
   value: ViewMode;
   onChange: (value: ViewMode) => void;
};

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => {
   const { t } = useTranslation();

   return (
      <ToggleGroup
         type="single"
         value={value}
         onValueChange={(v) => (v === 'table' || v === 'grid') && onChange(v)}
         className="rounded-lg border p-0.5"
         size="sm"
      >
         <ToggleGroupItem value="table" aria-label={t('common.viewMode.table')}>
            <List className="h-4 w-4" />
         </ToggleGroupItem>
         <ToggleGroupItem value="grid" aria-label={t('common.viewMode.grid')}>
            <LayoutGrid className="h-4 w-4" />
         </ToggleGroupItem>
      </ToggleGroup>
   );
};
