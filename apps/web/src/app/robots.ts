import type { MetadataRoute } from 'next';

import { env } from '@/env';

export default function robots(): MetadataRoute.Robots {
   return {
      rules: {
         userAgent: '*',
         allow: '/',
         disallow: '/api/',
      },
      ...(env.ROBOTS_NOINDEX === 'true'
         ? {}
         : { sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml` }),
   };
}
