import { Dialog as DialogPrimitive } from 'radix-ui';
import { useTranslation } from 'react-i18next';

import { useAiChatStore } from '@/features/ai-chat/hooks/useAiChatStore';

import { AiChatPanel } from './AiChatPanel';

export const AiChatFullpage = () => {
   const { t } = useTranslation();
   const close = useAiChatStore((s) => s.close);

   return (
      <DialogPrimitive.Root open onOpenChange={(open) => !open && close()}>
         <DialogPrimitive.Portal>
            <DialogPrimitive.Content
               className="fixed inset-0 z-50 bg-background outline-none"
               aria-describedby={undefined}
               onInteractOutside={(event) => event.preventDefault()}
            >
               <DialogPrimitive.Title className="sr-only">{t('chat.name')}</DialogPrimitive.Title>
               <AiChatPanel />
            </DialogPrimitive.Content>
         </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
   );
};
