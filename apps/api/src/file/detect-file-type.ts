import { loadEsm } from 'load-esm';
import { pathToFileURL } from 'url';

type FileTypeModule = {
   fileTypeFromBuffer: (buffer: Uint8Array) => Promise<{ ext: string; mime: string } | undefined>;
};

let fileTypeModule: Promise<FileTypeModule> | undefined;

const loadFileType = (): Promise<FileTypeModule> => {
   if (!fileTypeModule) {
      let specifier = 'file-type';
      try {
         specifier = pathToFileURL(require.resolve('file-type')).href;
      } catch {
         // Resolved by name from `load-esm`, as Nest falls back to.
      }
      fileTypeModule = loadEsm<FileTypeModule>(specifier).catch((error: unknown) => {
         fileTypeModule = undefined;
         throw error;
      });
   }
   return fileTypeModule;
};

export const detectFileType = async (buffer: Uint8Array): Promise<string | undefined> => {
   const { fileTypeFromBuffer } = await loadFileType();
   return (await fileTypeFromBuffer(buffer))?.mime;
};
