import { Injectable } from '@nestjs/common';

import { VIEW_IMAGE_MAX_BYTES } from '@/ai/tools/limits';
import { NOT_TRASHED } from '@/common/trash/trash';
import { FileVariantType, Language } from '@/generated/prisma/enums';
import { PrismaService } from '@/prisma/prisma.service';
import { StorageService } from '@/storage/storage.service';

import { fileDisplayName } from './file-display-name';

const PREVIEW_SIZES = [FileVariantType.medium, FileVariantType.large] as const;
export type PreviewSize = (typeof PREVIEW_SIZES)[number];

export type ImagePreview = {
   fileId: number;
   name: string;
   language: Language | null;
   altText: string | null;
   variant: PreviewSize;
   mimeType: string;
   width: number | null;
   height: number | null;
   sizeBytes: number;
   storagePath: string;
};

export type ImagePreviewLookup =
   | { found: true; preview: ImagePreview }
   | { found: false; reason: string };

@Injectable()
export class FileImagePreviewService {
   constructor(
      private readonly prisma: PrismaService,
      private readonly storage: StorageService,
   ) {}

   async find(fileId: number, size: PreviewSize): Promise<ImagePreviewLookup> {
      const file = await this.prisma.file.findFirst({
         where: { id: fileId, ...NOT_TRASHED },
         select: {
            id: true,
            originalName: true,
            displayName: true,
            altText: true,
            language: true,
            mimeType: true,
            processingStatus: true,
            variants: {
               where: { variant: { in: [...PREVIEW_SIZES] } },
               select: {
                  variant: true,
                  storagePath: true,
                  mimeType: true,
                  size: true,
                  width: true,
                  height: true,
               },
            },
         },
      });
      if (!file) return { found: false, reason: 'File not found' };
      if (!file.mimeType.startsWith('image/')) {
         return { found: false, reason: `Not an image (${file.mimeType})` };
      }

      const order: PreviewSize[] =
         size === FileVariantType.large ? ['large', 'medium'] : ['medium'];
      const variant = order
         .map((name) => file.variants.find((v) => v.variant === name))
         .find((v) => v !== undefined && v.size <= VIEW_IMAGE_MAX_BYTES);
      if (!variant) {
         const any = file.variants.length > 0;
         return {
            found: false,
            reason: any
               ? `The preview is larger than ${VIEW_IMAGE_MAX_BYTES / 1024} KB`
               : `No preview variant (processing: ${file.processingStatus})`,
         };
      }

      return {
         found: true,
         preview: {
            fileId: file.id,
            name: fileDisplayName(file),
            language: file.language,
            altText: file.altText,
            variant: variant.variant as PreviewSize,
            mimeType: variant.mimeType,
            width: variant.width,
            height: variant.height,
            sizeBytes: variant.size,
            storagePath: variant.storagePath,
         },
      };
   }

   async readBytes(preview: ImagePreview): Promise<Buffer> {
      const bytes = await this.storage.getBuffer(preview.storagePath);
      if (bytes.length > VIEW_IMAGE_MAX_BYTES) {
         throw new Error(`The preview is larger than ${VIEW_IMAGE_MAX_BYTES / 1024} KB`);
      }
      return bytes;
   }
}
