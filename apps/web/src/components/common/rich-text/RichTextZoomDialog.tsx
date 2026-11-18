import * as Dialog from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';

import CrossSvg from '@/assets/icons/cross.svg';
import type { ZoomTarget } from '@/utils/enhanceRichText';

type RichTextZoomDialogProps = {
   target: ZoomTarget | null;
   onClose: () => void;
   returnFocusTo: () => HTMLElement | null;
};

export function RichTextZoomDialog({ target, onClose, returnFocusTo }: RichTextZoomDialogProps) {
   const t = useTranslations('RichText');

   let title = t('tableTitle');
   if (target?.kind === 'image') title = target.alt.trim() || t('imageTitle');

   return (
      <Dialog.Root
         open={target !== null}
         onOpenChange={(open) => {
            if (!open) onClose();
         }}
      >
         <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-70 bg-background" />
            <Dialog.Content
               aria-describedby={undefined}
               onCloseAutoFocus={(event) => {
                  const opener = returnFocusTo();
                  if (!opener?.isConnected) return;
                  event.preventDefault();
                  opener.focus();
               }}
               className="fixed inset-0 z-70 flex flex-col bg-background text-foreground"
            >
               <Dialog.Title className="sr-only">{title}</Dialog.Title>
               <div className="flex shrink-0 justify-end px-6.25 py-4">
                  <Dialog.Close
                     aria-label={t('close')}
                     className="flex size-10 items-center justify-center text-foreground outline-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid"
                  >
                     <CrossSvg aria-hidden className="h-6 w-auto" />
                  </Dialog.Close>
               </div>

               {target?.kind === 'table' && (
                  <div
                     ref={(node) => {
                        node?.replaceChildren(target.table);
                     }}
                     // globals.css gives the cells here a minimum width, so a wide table scrolls.
                     data-rich-zoom-view=""
                     tabIndex={0}
                     role="region"
                     aria-label={title}
                     className="prose prose-lg max-w-none flex-1 overflow-auto px-6.25 pb-6.25 outline-brand focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-solid"
                  />
               )}

               {target?.kind === 'image' && (
                  <div className="flex min-h-0 flex-1 items-center justify-center px-6.25 pb-6.25">
                     <img
                        src={target.src}
                        alt={target.alt}
                        className="max-h-full max-w-full object-contain"
                     />
                  </div>
               )}
            </Dialog.Content>
         </Dialog.Portal>
      </Dialog.Root>
   );
}
