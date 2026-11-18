import { type NextRequest } from 'next/server';

import { getProjects } from '@/features/project/api/getProjects';
import { projectsPageQuerySchema } from '@/features/project/utils/projectsPage';

export async function GET(request: NextRequest) {
   const query = projectsPageQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
   );

   if (!query.success) {
      return Response.json({ error: 'Invalid query' }, { status: 400 });
   }

   return Response.json(await getProjects(query.data.locale, query.data.page));
}
