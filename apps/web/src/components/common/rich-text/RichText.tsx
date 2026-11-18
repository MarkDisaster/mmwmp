'use client';

import { cn } from '@mm/utils/cn';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ZoomTarget } from '@/utils/enhanceRichText';
import { enhanceRichText, readZoomTarget } from '@/utils/enhanceRichText';

import { RichTextZoomDialog } from './RichTextZoomDialog';

type RichTextProps = {
   html: string;
   className?: string;
};

export function RichText({ html, className }: RichTextProps) {
   const t = useTranslations('RichText');
   const containerRef = useRef<HTMLDivElement>(null);
   const openerRef = useRef<HTMLElement | null>(null);
   const [target, setTarget] = useState<ZoomTarget | null>(null);

   const openTable = t('openTable');
   const openImage = t('openImage');
   const labels = useMemo(() => ({ openTable, openImage }), [openTable, openImage]);
   const content = useMemo(() => ({ __html: html }), [html]);

   useEffect(() => {
      if (containerRef.current) enhanceRichText(containerRef.current, labels);
   }, [html, labels]);

   useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleClick = (event: MouseEvent) => {
         if (!(event.target instanceof Element)) return;
         const open = (opener: HTMLElement) => {
            openerRef.current = opener;
            setTarget(readZoomTarget(opener));
         };

         const button = event.target.closest('[data-rich-open]');
         if (button instanceof HTMLElement && container.contains(button)) {
            open(button);
            return;
         }

         if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
         const wrapper = event.target.closest('[data-rich-zoom="image"]');
         if (!(wrapper instanceof HTMLElement) || !container.contains(wrapper)) return;
         const opener = wrapper.querySelector('[data-rich-open]');
         if (!(opener instanceof HTMLElement)) return;
         event.preventDefault();
         open(opener);
      };

      container.addEventListener('click', handleClick);
      return () => container.removeEventListener('click', handleClick);
   }, []);

   return (
      <>
         <div
            ref={containerRef}
            className={cn('prose prose-lg max-w-none min-w-0', className)}
            dangerouslySetInnerHTML={content}
         />
         <RichTextZoomDialog
            target={target}
            onClose={() => setTarget(null)}
            returnFocusTo={() => openerRef.current}
         />
      </>
   );
}
