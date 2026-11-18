'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import type { PublicFileEntity } from '@/api/generated/models/PublicFileEntity';
import type { PublicProjectMediaEntity } from '@/api/generated/models/PublicProjectMediaEntity';
import { RichTextZoomDialog } from '@/components/common/rich-text/RichTextZoomDialog';
import type { ZoomTarget } from '@/utils/enhanceRichText';

type ProjectMediaProps = {
   media: PublicProjectMediaEntity[];
   locale: string;
};

function variantUrl(file: PublicFileEntity, name: string): string | undefined {
   return file.variants.find((v) => v.variant === name)?.publicUrl;
}

function originalUrl(file: PublicFileEntity): string | undefined {
   return variantUrl(file, 'original') ?? file.variants[0]?.publicUrl;
}

function fileKind(file: PublicFileEntity): string {
   const extension = file.displayName?.match(/\.([a-z0-9]{1,5})$/i)?.[1];
   return (extension ?? file.mimeType.split('/')[1] ?? '').toLowerCase();
}

export function ProjectMedia({ media, locale }: ProjectMediaProps) {
   const t = useTranslations('Projects');
   const tRichText = useTranslations('RichText');
   const [target, setTarget] = useState<ZoomTarget | null>(null);
   const openerRef = useRef<HTMLButtonElement | null>(null);

   const items = media
      .filter((item) => item.language === null || item.language === locale)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((item) => originalUrl(item.file));
   const images = items.filter((item) => item.file.mimeType.startsWith('image/'));
   const files = items.filter((item) => !item.file.mimeType.startsWith('image/'));

   if (items.length === 0) return null;

   return (
      <div className="mt-12.5 flex flex-col gap-12.5">
         {images.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
               {images.map(({ id, file }) => {
                  const original = originalUrl(file) ?? '';
                  const alt = file.altText ?? '';

                  return (
                     <button
                        key={id}
                        type="button"
                        aria-label={
                           alt ? `${tRichText('openImage')}: ${alt}` : tRichText('openImage')
                        }
                        className="block w-full cursor-zoom-in outline-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid"
                        onClick={(event) => {
                           openerRef.current = event.currentTarget;
                           setTarget({ kind: 'image', src: original, alt });
                        }}
                     >
                        <Image
                           src={variantUrl(file, 'medium') ?? original}
                           alt={alt}
                           width={file.width ?? 1200}
                           height={file.height ?? 800}
                           className="h-auto w-full"
                           sizes="(min-width: 1200px) 384px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        />
                     </button>
                  );
               })}
            </div>
         )}

         {files.length > 0 && (
            <div>
               <h2 className="text-xl font-bold">{t('mediaFiles')}</h2>
               <ul className="mt-4 flex flex-col gap-2">
                  {files.map(({ id, file }) => (
                     <li key={id}>
                        <a href={originalUrl(file)} target="_blank" rel="noopener noreferrer">
                           {file.displayName?.trim() || t('mediaFiles')}
                        </a>{' '}
                        <span className="text-sm text-muted-foreground uppercase">
                           {fileKind(file)}
                        </span>
                     </li>
                  ))}
               </ul>
            </div>
         )}

         <RichTextZoomDialog
            target={target}
            onClose={() => setTarget(null)}
            returnFocusTo={() => openerRef.current}
         />
      </div>
   );
}
