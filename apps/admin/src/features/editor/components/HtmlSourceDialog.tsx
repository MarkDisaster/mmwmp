import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { DialogFooter, DialogLayout } from '@/components/ui/dialog';
import { formatHtml } from '@/features/editor/utils/formatHtml';

type HtmlSourceDialogProps = {
   open: boolean;
   html: string;
   onClose: () => void;
};

export const HtmlSourceDialog = ({ open, html, onClose }: HtmlSourceDialogProps) => {
   const { t } = useTranslation();

   const copy = async () => {
      try {
         await navigator.clipboard.writeText(html);
         toast.success(t('textEditor.copied'));
      } catch {
         toast.error(t('textEditor.copyFailed'));
      }
   };

   return (
      <DialogLayout
         open={open}
         onOpenChange={(isOpen) => !isOpen && onClose()}
         title={t('textEditor.htmlSource')}
      >
         <pre
            tabIndex={0}
            className="max-h-[60vh] overflow-auto rounded-md border bg-muted p-3 font-mono text-xs"
         >
            {formatHtml(html)}
         </pre>
         <DialogFooter>
            <Button type="button" onClick={copy}>
               {t('textEditor.copyHtml')}
            </Button>
         </DialogFooter>
      </DialogLayout>
   );
};
