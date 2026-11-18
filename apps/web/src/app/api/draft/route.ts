import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import { env } from '@/env';
import {
   type DraftType,
   getDraftPath,
   isDraftType,
   resolveDraftLocale,
} from '@/features/draft-preview/utils/draftPath';
import { verifyPreviewToken } from '@/features/draft-preview/utils/previewToken';
import { isSecretValid } from '@/utils/secret';

const reject = (status: 400 | 401, message: string) =>
   new Response(message, { status, headers: { 'Cache-Control': 'no-store' } });

const openDraft = async (type: DraftType, locale: string | null, slug: string) => {
   const draft = await draftMode();
   draft.enable();

   redirect(getDraftPath(type, resolveDraftLocale(locale), slug));
};

export async function GET(request: NextRequest) {
   const { searchParams } = request.nextUrl;
   const token = searchParams.get('token');

   if (token !== null) {
      const payload = env.PREVIEW_URL_SIGNING_KEY
         ? verifyPreviewToken(token, env.PREVIEW_URL_SIGNING_KEY)
         : null;
      if (!payload) return reject(401, 'Invalid or expired token');

      return openDraft(payload.resource, payload.locale, payload.slug);
   }

   const secret = searchParams.get('secret');
   const slug = searchParams.get('slug');
   const type = searchParams.get('type') ?? 'projects';

   if (!secret || !env.PREVIEW_SECRET || !isSecretValid(secret, env.PREVIEW_SECRET)) {
      return reject(401, 'Invalid secret');
   }

   if (!slug || !isDraftType(type)) return reject(400, 'Invalid parameters');

   return openDraft(type, searchParams.get('locale'), slug);
}
