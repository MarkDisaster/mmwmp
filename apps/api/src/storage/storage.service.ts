import {
   DeleteObjectCommand,
   DeleteObjectsCommand,
   GetObjectCommand,
   ListObjectsV2Command,
   PutObjectCommand,
   S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

import { FileVariantType } from '@/generated/prisma/enums';

import { InvalidImageError } from './invalid-image.error';

type UploadResult = {
   key: string;
   width: number | null;
   height: number | null;
};

type VariantConfig = {
   name: FileVariantType;
   maxWidth: number;
};

type VariantResult = {
   variant: FileVariantType;
   storagePath: string;
   mimeType: string;
   size: number;
   width: number | null;
   height: number | null;
};

const VARIANT_CONFIGS: VariantConfig[] = [
   { name: FileVariantType.thumbnail, maxWidth: 250 },
   { name: FileVariantType.medium, maxWidth: 800 },
   { name: FileVariantType.large, maxWidth: 1920 },
];
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export const RESIZED_VARIANT_NAMES: readonly FileVariantType[] = VARIANT_CONFIGS.map((c) => c.name);

const IMAGE_QUALITY = 80;

const JPEG_ORIGINAL_QUALITY = 92;

const MAX_INPUT_PIXELS = 50_000_000;
export const SHARP_INPUT = { limitInputPixels: MAX_INPUT_PIXELS } as const;

type ImageFormat = keyof sharp.FormatEnum;

const IMAGE_MIME_BY_FORMAT: Partial<Record<ImageFormat, string>> = {
   jpeg: 'image/jpeg',
   png: 'image/png',
   webp: 'image/webp',
   gif: 'image/gif',
};

const REENCODE_BY_FORMAT: Partial<
   Record<ImageFormat, (image: sharp.Sharp, meta: sharp.Metadata) => sharp.Sharp>
> = {
   jpeg: (image) => image.rotate().keepIccProfile().jpeg({ quality: JPEG_ORIGINAL_QUALITY }),
   png: (image, meta) => {
      const withProfile = image.keepIccProfile();
      const sameDepth =
         meta.depth === 'ushort'
            ? withProfile.toColourspace(meta.channels >= 3 ? 'rgb16' : 'grey16')
            : withProfile;
      return sameDepth.png({ compressionLevel: 9, adaptiveFiltering: true });
   },
};

export const EXTENSION_BY_MIME: Record<string, string> = {
   'application/pdf': 'pdf',
   'application/zip': 'zip',
   'application/x-rar-compressed': 'rar',
   'application/x-7z-compressed': '7z',
   'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
   'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
   'video/mp4': 'mp4',
   'video/webm': 'webm',
};

const S3_CONNECTION_TIMEOUT_MS = 5_000;
const S3_REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class StorageService {
   private readonly s3: S3Client;
   private readonly bucket: string;
   private readonly publicUrl: string;
   private readonly logger = new Logger(StorageService.name);

   constructor(private config: ConfigService) {
      this.bucket = this.config.getOrThrow<string>('storage.bucket');
      this.publicUrl = this.config.getOrThrow<string>('storage.publicUrl');

      this.s3 = new S3Client({
         region: 'auto',
         endpoint: this.config.getOrThrow<string>('storage.endpoint'),
         forcePathStyle: this.config.get<boolean>('storage.forcePathStyle') ?? false,
         requestHandler: {
            connectionTimeout: S3_CONNECTION_TIMEOUT_MS,
            requestTimeout: S3_REQUEST_TIMEOUT_MS,
         },
         credentials: {
            accessKeyId: this.config.getOrThrow<string>('storage.accessKeyId'),
            secretAccessKey: this.config.getOrThrow<string>('storage.secretAccessKey'),
         },
      });
   }

   isImage(mimeType: string): boolean {
      return mimeType.startsWith('image/') && !mimeType.includes('svg');
   }

   async uploadOriginalImage(buffer: Buffer, basePath: string): Promise<VariantResult> {
      let meta: sharp.Metadata;
      try {
         meta = await sharp(buffer, { limitInputPixels: false }).metadata();
      } catch {
         throw new InvalidImageError('The image cannot be read');
      }
      const format = meta.format as ImageFormat | undefined;
      const mimeType = format && IMAGE_MIME_BY_FORMAT[format];
      if (!format || !mimeType) throw new InvalidImageError('Unsupported image format');
      if ((meta.width ?? 0) * (meta.height ?? 0) > MAX_INPUT_PIXELS) {
         throw new InvalidImageError('The image is too large');
      }

      let body = buffer;
      let width = meta.width ?? null;
      let height = meta.height ?? null;
      const reEncode = REENCODE_BY_FORMAT[format];
      if (reEncode) {
         try {
            const { data, info } = await reEncode(sharp(buffer, SHARP_INPUT), meta).toBuffer({
               resolveWithObject: true,
            });
            body = data;
            width = info.width;
            height = info.height;
         } catch {
            throw new InvalidImageError('The image cannot be read');
         }
      }

      const originalKey = `${basePath}/original.${this.getExtForMimeType(mimeType)}`;
      await this.s3.send(
         new PutObjectCommand({
            Bucket: this.bucket,
            Key: originalKey,
            Body: body,
            ContentType: mimeType,
            CacheControl: IMAGE_CACHE_CONTROL,
         }),
      );

      return {
         variant: FileVariantType.original,
         storagePath: originalKey,
         mimeType,
         size: body.byteLength,
         width,
         height,
      };
   }

   async generateResizedVariants(buffer: Buffer, basePath: string): Promise<VariantResult[]> {
      const pipeline = sharp(buffer, SHARP_INPUT).rotate();
      const results: VariantResult[] = [];
      for (const config of VARIANT_CONFIGS) {
         const { data: resized, info: metadata } = await pipeline
            .clone()
            .resize({ width: config.maxWidth, withoutEnlargement: true })
            .webp({ quality: IMAGE_QUALITY })
            .toBuffer({ resolveWithObject: true });

         const key = `${basePath}/${config.name}.webp`;

         await this.s3.send(
            new PutObjectCommand({
               Bucket: this.bucket,
               Key: key,
               Body: resized,
               ContentType: 'image/webp',
               CacheControl: IMAGE_CACHE_CONTROL,
            }),
         );

         results.push({
            variant: config.name,
            storagePath: key,
            mimeType: 'image/webp' as const,
            size: resized.length,
            width: metadata.width,
            height: metadata.height,
         });
      }
      return results;
   }

   async getBuffer(key: string): Promise<Buffer> {
      const response = await this.s3.send(
         new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
         }),
      );
      const body = response.Body;
      if (!body) {
         throw new Error(`R2 object ${key} returned empty body`);
      }
      const bytes = await (
         body as { transformToByteArray: () => Promise<Uint8Array> }
      ).transformToByteArray();
      return Buffer.from(bytes);
   }

   async upload(buffer: Buffer, mimeType: string, basePath: string): Promise<UploadResult> {
      const ext = EXTENSION_BY_MIME[mimeType] ?? 'bin';
      const key = `${basePath}/original.${ext}`;

      await this.s3.send(
         new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: mimeType,
         }),
      );

      return { key, width: null, height: null };
   }

   async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<void> {
      await this.s3.send(
         new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
         }),
      );
   }

   async delete(key: string): Promise<void> {
      await this.s3.send(
         new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
         }),
      );
   }

   async deleteFolder(prefix: string): Promise<void> {
      let continuationToken: string | undefined;

      do {
         const listResponse = await this.s3.send(
            new ListObjectsV2Command({
               Bucket: this.bucket,
               Prefix: prefix,
               ContinuationToken: continuationToken,
            }),
         );

         const objects = (listResponse.Contents ?? [])
            .map((obj) => obj.Key)
            .filter((key): key is string => key !== undefined)
            .map((key) => ({ Key: key }));

         if (objects.length > 0) {
            await this.s3.send(
               new DeleteObjectsCommand({
                  Bucket: this.bucket,
                  Delete: {
                     Objects: objects,
                     Quiet: true,
                  },
               }),
            );
         }

         continuationToken = listResponse.IsTruncated
            ? listResponse.NextContinuationToken
            : undefined;
      } while (continuationToken);
   }

   async get(key: string) {
      const response = await this.s3.send(
         new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
         }),
      );

      return response.Body;
   }

   getPublicUrl(key: string): string {
      const base = this.publicUrl.replace(/\/+$/, '');
      return `${base}/${key}`;
   }

   private getExtForMimeType(mimeType: string): string {
      const map: Record<string, string> = {
         'image/jpeg': 'jpg',
         'image/png': 'png',
         'image/gif': 'gif',
         'image/webp': 'webp',
         'image/avif': 'avif',
         'image/tiff': 'tiff',
      };
      return map[mimeType] ?? 'bin';
   }
}
