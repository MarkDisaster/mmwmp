import { FileVariantType } from '@/generated/prisma/enums';
import type { StorageService } from '@/storage/storage.service';

export type StoredFile = {
   storagePath: string;
   variants: { variant: FileVariantType; storagePath: string }[];
};

export type FileWithPublicUrls<F extends StoredFile> = Omit<F, 'variants'> & {
   publicUrl: string;
   variants: (F['variants'][number] & { publicUrl: string })[];
};

export const toFileWithUrls = <F extends StoredFile>(
   file: F,
   storage: Pick<StorageService, 'getPublicUrl'>,
): FileWithPublicUrls<F> => {
   const original = file.variants.find((v) => v.variant === FileVariantType.original);
   return {
      ...file,
      publicUrl: storage.getPublicUrl(original?.storagePath ?? file.storagePath),
      variants: file.variants.map((v) => ({
         ...v,
         publicUrl: storage.getPublicUrl(v.storagePath),
      })),
   };
};
