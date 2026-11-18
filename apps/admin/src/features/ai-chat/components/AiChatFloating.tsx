import { cn } from '@mm/utils/cn';
import { Rnd } from 'react-rnd';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';

import { AiChatPanel } from './AiChatPanel';

const PANEL_WIDTH_PX = 360;
const PANEL_HEIGHT_PX = 500;
const DEFAULT_CORNER_OFFSET_PX = 32;

const calculateDefaultPosition = () => ({
   x: window.innerWidth - PANEL_WIDTH_PX - DEFAULT_CORNER_OFFSET_PX,
   y: window.innerHeight - PANEL_HEIGHT_PX - DEFAULT_CORNER_OFFSET_PX,
});

const DRAG_HANDLE_CLASS = 'chat-floating-drag-handle';

export const AiChatFloating = () => {
   const floatingPosition = useAiChatStore((s) => s.floatingPosition);
   const setFloatingPosition = useAiChatStore((s) => s.setFloatingPosition);

   const initialPosition = floatingPosition ?? calculateDefaultPosition();

   return (
      <Rnd
         default={{
            ...initialPosition,
            width: PANEL_WIDTH_PX,
            height: PANEL_HEIGHT_PX,
         }}
         position={floatingPosition ?? undefined}
         bounds="window"
         enableResizing={false}
         dragHandleClassName={DRAG_HANDLE_CLASS}
         onDragStop={(_, d) => setFloatingPosition({ x: d.x, y: d.y })}
         className="z-40"
      >
         <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-background shadow-2xl">
            <div
               className={cn(
                  DRAG_HANDLE_CLASS,
                  'h-2 w-full cursor-move bg-border transition-colors hover:bg-muted-foreground/30',
               )}
            />
            <div className="flex-1 overflow-hidden">
               <AiChatPanel />
            </div>
         </div>
      </Rnd>
   );
};
