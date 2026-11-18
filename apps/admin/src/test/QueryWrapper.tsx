import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { queryClient } from '@/utils/query-client';

export const QueryWrapper = ({ children }: { children: ReactNode }) => (
   <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
