import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import { FileVariantType } from '@/generated/prisma/enums';

import type { StorageService } from './storage.service';
import { EXTENSION_BY_MIME, RESIZED_VARIANT_NAMES } from './storage.service';

type VariantResult = Awaited<ReturnType<StorageService['uploadOriginalImage']>>;

type StoragePort = Omit<Pick<StorageService, keyof StorageService>, 'get'>;

@Injectable()
export class StorageTestService implements StoragePort {
   private readonly store = new Map<string, Buffer>();

   isImage(mimeType: string): boolean {
      return mimeType.startsWith('image/') && !mimeType.includes('svg');
   }

   async uploadOriginalImage(buffer: Buffer, basePath: string): Promise<VariantResult> {
      const format = (await sharp(buffer).metadata()).format;
      const mimeType = `image/${format}`;
      const key = `${basePath}/original.${format === 'jpeg' ? 'jpg' : format}`;
      this.store.set(key, buffer);

      return this.describe(FileVariantType.original, key, mimeType, buffer);
   }

   async generateResizedVariants(buffer: Buffer, basePath: string): Promise<VariantResult[]> {
      return Promise.all(
         RESIZED_VARIANT_NAMES.map((variant) => {
            const key = `${basePath}/${variant}.webp`;
            this.store.set(key, buffer);
            return this.describe(variant, key, 'image/webp', buffer);
         }),
      );
   }

   async getBuffer(key: string): Promise<Buffer> {
      const buffer = this.store.get(key);
      if (!buffer) {
         throw new Error(`R2 object ${key} returned empty body`);
      }
      return buffer;
   }

   async upload(buffer: Buffer, mimeType: string, basePath: string) {
      const key = `${basePath}/original.${EXTENSION_BY_MIME[mimeType] ?? 'bin'}`;
      this.store.set(key, buffer);
      return { key, width: null, height: null };
   }

   async uploadBuffer(buffer: Buffer, key: string): Promise<void> {
      this.store.set(key, buffer);
   }

   async delete(key: string): Promise<void> {
      this.store.delete(key);
   }

   async deleteFolder(prefix: string): Promise<void> {
      for (const key of this.store.keys()) {
         if (key.startsWith(prefix)) {
            this.store.delete(key);
         }
      }
   }

   async get(key: string) {
      return this.store.get(key) ?? null;
   }

   getPublicUrl(key: string): string {
      return `https://test-storage.local/${key}`;
   }

   private async describe(
      variant: FileVariantType,
      storagePath: string,
      mimeType: string,
      buffer: Buffer,
   ): Promise<VariantResult> {
      return {
         variant,
         storagePath,
         mimeType,
         size: buffer.byteLength,
         ...(await this.dimensions(buffer)),
      };
   }

   private async dimensions(buffer: Buffer) {
      const metadata = await sharp(buffer)
         .metadata()
         .catch(() => null);
      return { width: metadata?.width ?? null, height: metadata?.height ?? null };
   }
}
