import type { MetadataRoute } from 'next';

import { SITE_NAME } from '@/utils/seo';

export default function manifest(): MetadataRoute.Manifest {
   return {
      name: SITE_NAME,
      short_name: SITE_NAME,
      start_url: '/',
      display: 'browser',
      icons: [
         { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
         { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      ],
   };
}
