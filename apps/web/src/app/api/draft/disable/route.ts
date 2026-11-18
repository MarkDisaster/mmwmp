import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { type NextRequest } from 'next/server';

import { resolveDraftLocale } from '@/features/draft-preview/utils/draftPath';

export async function GET(request: NextRequest) {
   const locale = resolveDraftLocale(request.nextUrl.searchParams.get('locale'));

   const draft = await draftMode();
   draft.disable();
   redirect(`/${locale}/`);
}
