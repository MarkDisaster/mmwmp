import type { FormEventHandler, ReactNode } from 'react';
import { useEffect, useRef } from 'react';

import { EDITOR_FORM_HEADER_CLASS, editorFormGridClass } from './editorFormLayoutClasses';

type EditorFormLayoutProps = {
   formId: string;
   onSubmit: FormEventHandler<HTMLFormElement>;
   header: ReactNode;
   notice?: ReactNode;
   toolbar?: ReactNode;
   sidebar?: ReactNode;
   children: ReactNode;
   disabled?: boolean;
};

export const EditorFormLayout = ({
   formId,
   onSubmit,
   header,
   notice,
   toolbar,
   sidebar,
   children,
   disabled,
}: EditorFormLayoutProps) => {
   const container = useRef<HTMLDivElement>(null);
   const lastFocused = useRef<HTMLElement | null>(null);

   useEffect(() => {
      const element = container.current;
      const remember = (event: FocusEvent) => {
         if (event.target instanceof HTMLElement) lastFocused.current = event.target;
      };
      element?.addEventListener('focusin', remember);
      return () => element?.removeEventListener('focusin', remember);
   }, []);

   useEffect(() => {
      const element = lastFocused.current;
      const active = document.activeElement;
      if (disabled || !element?.isConnected || (active && active !== document.body)) return;
      element.focus();
   }, [disabled]);

   return (
      <div ref={container} className="@container space-y-6">
         <div className={EDITOR_FORM_HEADER_CLASS}>{header}</div>
         {notice}
         {toolbar}
         <form id={formId} onSubmit={onSubmit} className={editorFormGridClass(!!sidebar)}>
            <fieldset disabled={disabled} className="contents">
               <div className="min-w-0 space-y-10">{children}</div>
               {sidebar && <div className="min-w-0 space-y-10">{sidebar}</div>}
            </fieldset>
         </form>
      </div>
   );
};
