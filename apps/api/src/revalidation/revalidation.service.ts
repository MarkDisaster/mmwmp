import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const REVALIDATION_TAGS = ['services', 'projects', 'contact', 'tags'] as const;
export type RevalidationTag = (typeof REVALIDATION_TAGS)[number];

export type RevalidationResult = {
   tag: RevalidationTag;
   revalidated: boolean;
   reason?: string;
};

@Injectable()
export class RevalidationService implements OnModuleDestroy {
   private readonly logger = new Logger(RevalidationService.name);
   private readonly pendingTags = new Set<RevalidationTag>();
   private debounceTimeout: NodeJS.Timeout | null = null;

   constructor(private config: ConfigService) {}

   onModuleDestroy(): void {
      if (this.debounceTimeout) {
         clearTimeout(this.debounceTimeout);
         this.debounceTimeout = null;
      }
   }

   revalidate(tag: RevalidationTag): void {
      this.pendingTags.add(tag);
      if (this.debounceTimeout) {
         return;
      }
      this.debounceTimeout = setTimeout(() => {
         const tags = Array.from(this.pendingTags);
         this.pendingTags.clear();
         this.debounceTimeout = null;
         for (const t of tags) {
            void this.sendRevalidation(t);
         }
      }, 50);
   }

   async revalidateNow(tags: readonly RevalidationTag[]): Promise<RevalidationResult[]> {
      return Promise.all([...new Set(tags)].map((tag) => this.sendRevalidation(tag)));
   }

   private async sendRevalidation(tag: RevalidationTag): Promise<RevalidationResult> {
      const webUrl = this.config.get<string>('app.webUrl');
      const secret = this.config.get<string>('app.revalidateSecret');

      if (!webUrl || !secret) {
         this.logger.warn(
            `Revalidation skipped for tag "${tag}" — WEB_URL or REVALIDATE_SECRET not configured`,
         );
         return {
            tag,
            revalidated: false,
            reason: 'WEB_URL or REVALIDATE_SECRET is not configured',
         };
      }

      const baseUrl = webUrl.replace(/\/$/, '');

      try {
         const response = await fetch(`${baseUrl}/api/revalidate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag, secret }),
            signal: AbortSignal.timeout(5000),
         });

         if (!response.ok) {
            const text = await response.text().catch(() => '');
            this.logger.warn(
               `Revalidation failed for tag "${tag}" — status ${response.status}: ${text}`,
            );
            return { tag, revalidated: false, reason: `the web answered ${response.status}` };
         }
         this.logger.debug(`Revalidated tag "${tag}"`);
         return { tag, revalidated: true };
      } catch (err) {
         this.logger.warn(
            `Revalidation error for tag "${tag}": ${err instanceof Error ? err.message : String(err)}`,
         );
         return { tag, revalidated: false, reason: 'the web did not answer in time' };
      }
   }
}
