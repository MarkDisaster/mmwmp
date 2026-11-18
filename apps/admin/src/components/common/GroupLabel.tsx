import type { ComponentProps } from 'react';

import { Label } from '@/components/ui/label';

export const GroupLabel = ({
   children,
   ...props
}: Omit<ComponentProps<typeof Label>, 'asChild'>) => (
   <Label asChild {...props}>
      <span>{children}</span>
   </Label>
);
