import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DialogFooter, DialogLayout } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isInternalHref, isParsableHref, normalizeHref } from '@/features/editor/utils/linkHref';

export type LinkValue = {
   href: string;
   newTab: boolean;
};

type LinkDialogProps = {
   open: boolean;
   initialValue: LinkValue | null;
   onSubmit: (value: LinkValue) => boolean;
   onRemove: () => void;
   onClose: () => void;
};

type LinkFormProps = Omit<LinkDialogProps, 'open'>;

const LinkForm = ({ initialValue, onSubmit, onRemove, onClose }: LinkFormProps) => {
   const { t } = useTranslation();
   const [href, setHref] = useState(initialValue?.href ?? '');
   const [newTab, setNewTab] = useState(initialValue?.newTab ?? true);
   const [newTabTouched, setNewTabTouched] = useState(initialValue !== null);

   const [invalid, setInvalid] = useState(false);

   const handleHrefChange = (value: string) => {
      setHref(value);
      setInvalid(false);
      if (!newTabTouched) setNewTab(!isInternalHref(normalizeHref(value)));
   };

   const handleSubmit = () => {
      const normalized = normalizeHref(href);
      if (!normalized) {
         onRemove();
         return;
      }
      setInvalid(!isParsableHref(normalized) || !onSubmit({ href: normalized, newTab }));
   };

   return (
      <>
         <form
            className="space-y-4"
            onSubmit={(event) => {
               event.preventDefault();
               event.stopPropagation();
               handleSubmit();
            }}
         >
            <div className="space-y-2">
               <Label htmlFor="link-dialog-url">{t('linkDialog.url')}</Label>
               <Input
                  id="link-dialog-url"
                  value={href}
                  placeholder={t('linkDialog.urlPlaceholder')}
                  autoFocus
                  aria-invalid={invalid}
                  aria-describedby={invalid ? 'link-dialog-url-error' : undefined}
                  onChange={(event) => handleHrefChange(event.target.value)}
               />
               {invalid && (
                  <p id="link-dialog-url-error" role="alert" className="text-sm text-destructive">
                     {t('linkDialog.invalid')}
                  </p>
               )}
            </div>
            <Label htmlFor="link-dialog-new-tab" className="cursor-pointer">
               <Checkbox
                  id="link-dialog-new-tab"
                  checked={newTab}
                  onChange={(event) => {
                     setNewTab(event.target.checked);
                     setNewTabTouched(true);
                  }}
               />
               {t('linkDialog.newTab')}
            </Label>
         </form>
         <DialogFooter>
            {initialValue && (
               <Button type="button" variant="destructive" onClick={onRemove}>
                  {t('linkDialog.remove')}
               </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
               {t('common.cancel')}
            </Button>
            <Button type="button" onClick={handleSubmit}>
               {t('common.save')}
            </Button>
         </DialogFooter>
      </>
   );
};

export const LinkDialog = ({ open, onClose, ...formProps }: LinkDialogProps) => {
   const { t } = useTranslation();

   return (
      <DialogLayout
         open={open}
         onOpenChange={(isOpen) => !isOpen && onClose()}
         title={t('linkDialog.title')}
      >
         <LinkForm onClose={onClose} {...formProps} />
      </DialogLayout>
   );
};
