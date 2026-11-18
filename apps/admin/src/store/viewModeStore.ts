import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'table' | 'grid';

type ViewModeState = {
   modes: Record<string, ViewMode>;
   setViewMode: (key: string, mode: ViewMode) => void;
};

const useViewModeStore = create<ViewModeState>()(
   persist(
      (set) => ({
         modes: {},
         setViewMode: (key, mode) => set((state) => ({ modes: { ...state.modes, [key]: mode } })),
      }),
      { name: 'view-mode' },
   ),
);

export const useViewMode = (key: string, defaultMode: ViewMode = 'table') => {
   const mode = useViewModeStore((state) => state.modes[key] ?? defaultMode);
   const setViewMode = useViewModeStore((state) => state.setViewMode);
   return [mode, (m: ViewMode) => setViewMode(key, m)] as const;
};
