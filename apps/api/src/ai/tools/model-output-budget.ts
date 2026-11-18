export const MODEL_OUTPUT_MAX_IMAGES = 16;

const MODEL_OUTPUT_MAX_BYTES = 4 * 1024 * 1024;

export type BudgetDecision = 'granted' | 'duplicate' | 'exhausted';

export class ModelOutputBudget {
   private images = 0;
   private bytes = 0;
   private readonly seen = new Set<string>();

   constructor(
      private readonly maxImages = MODEL_OUTPUT_MAX_IMAGES,
      private readonly maxBytes = MODEL_OUTPUT_MAX_BYTES,
   ) {}

   takeImage(key: string): BudgetDecision {
      if (this.seen.has(key)) return 'duplicate';
      if (this.images >= this.maxImages) return 'exhausted';
      this.seen.add(key);
      this.images += 1;
      return 'granted';
   }

   takeBytes(size: number): boolean {
      if (this.bytes + size > this.maxBytes) return false;
      this.bytes += size;
      return true;
   }
}
