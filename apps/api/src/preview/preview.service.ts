import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PREVIEW_TOKEN_TTL_SECONDS, type PreviewResource, signPreviewToken } from './preview-token';

type PreviewRecord = { id: number; slug: string };

@Injectable()
export class PreviewService implements OnModuleInit {
   private readonly logger = new Logger(PreviewService.name);

   constructor(private config: ConfigService) {}

   onModuleInit(): void {
      const uses = this.legacySecretUses();
      if (uses.length === 0) return;
      this.logger.warn(
         `PREVIEW_SECRET is deprecated and still in use: ${uses.join('; ')}. ` +
            'Remove it once PREVIEW_URL_SIGNING_KEY and PREVIEW_API_TOKEN are set on the API and the web.',
      );
   }

   getPreviewUrl(
      resource: PreviewResource,
      record: PreviewRecord,
      locale: string,
      now = Date.now(),
   ): string {
      const webUrl = this.config.getOrThrow<string>('app.webUrl');
      const signingKey = this.config.get<string>('auth.previewUrlSigningKey');

      if (signingKey) {
         const token = signPreviewToken(
            {
               resource,
               id: record.id,
               slug: record.slug,
               locale,
               exp: Math.floor(now / 1000) + PREVIEW_TOKEN_TTL_SECONDS,
            },
            signingKey,
         );
         return `${webUrl}/api/draft?${new URLSearchParams({ token })}`;
      }

      const secret = this.config.getOrThrow<string>('auth.previewSecret');
      const query = new URLSearchParams({ secret, slug: record.slug, type: resource, locale });
      return `${webUrl}/api/draft?${query}`;
   }

   private legacySecretUses(): string[] {
      if (!this.config.get<string>('auth.previewSecret')) return [];
      const uses: string[] = [];
      if (!this.config.get<string>('auth.previewUrlSigningKey')) {
         uses.push(
            'preview links carry it instead of a signed token (PREVIEW_URL_SIGNING_KEY unset)',
         );
      }
      uses.push(
         this.config.get<string>('auth.previewApiToken')
            ? 'it is still accepted as the draft API token next to PREVIEW_API_TOKEN'
            : 'it is the only draft API token (PREVIEW_API_TOKEN unset)',
      );
      return uses;
   }
}
