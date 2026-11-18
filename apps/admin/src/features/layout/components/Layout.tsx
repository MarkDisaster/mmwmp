import { cn } from '@mm/utils/cn';
import type { PropsWithChildren } from 'react';
import { useDefaultLayout } from 'react-resizable-panels';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { AiChat } from '@/features/ai-chat/components/AiChat';
import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';
import { useResponsive } from '@/hooks/useResponsive';

import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';

const SIDEBAR_PANEL_ID = 'aurora-sidebar';
const MAIN_PANEL_ID = 'main-content';
const SPLIT_PANEL_IDS = [MAIN_PANEL_ID, SIDEBAR_PANEL_ID];
const MAIN_ONLY_PANEL_IDS = [MAIN_PANEL_ID];
const SIDEBAR_DEFAULT_SIZE = 28;
const SIDEBAR_MIN_SIZE = 15;
const SIDEBAR_MAX_SIZE = 60;

export const Layout = ({ children }: PropsWithChildren) => {
   const mode = useAiChatStore((s) => s.mode);
   const { isMobile } = useResponsive();
   const sidebarMode = !isMobile && mode === 'sidebar';

   const defaultLayoutProps = useDefaultLayout({
      id: 'aurora-layout',
      panelIds: sidebarMode ? SPLIT_PANEL_IDS : MAIN_ONLY_PANEL_IDS,
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
   });

   return (
      <div className="relative flex h-screen flex-row bg-background">
         <MobileHeader />
         <Sidebar />
         <ResizablePanelGroup
            orientation="horizontal"
            className={cn('flex-1', !sidebarMode && 'touch-auto!')}
            {...defaultLayoutProps}
         >
            <ResizablePanel
               id={MAIN_PANEL_ID}
               defaultSize={sidebarMode ? `${100 - SIDEBAR_DEFAULT_SIZE}%` : undefined}
               minSize="300px"
               className={cn(!sidebarMode && 'touch-auto!')}
            >
               <div className="relative w-full min-w-0 overflow-auto p-4 pt-18 md:pt-4">
                  <main className="min-h-[calc(100vh-2rem)] rounded-xl bg-card px-6 py-8 shadow-sm">
                     {children}
                  </main>
               </div>
            </ResizablePanel>
            {sidebarMode && (
               <>
                  <ResizableHandle withHandle />
                  <ResizablePanel
                     id={SIDEBAR_PANEL_ID}
                     defaultSize={`${SIDEBAR_DEFAULT_SIZE}%`}
                     minSize={`${SIDEBAR_MIN_SIZE}%`}
                     maxSize={`${SIDEBAR_MAX_SIZE}%`}
                  >
                     <AiChat />
                  </ResizablePanel>
               </>
            )}
         </ResizablePanelGroup>
         {!sidebarMode && <AiChat />}
      </div>
   );
};
