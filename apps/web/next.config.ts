import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { env } from './src/env';
import { assertProductionBuildEnv } from './src/utils/buildGuard';

assertProductionBuildEnv({
   VERCEL_ENV: process.env.VERCEL_ENV,
   NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
   ROBOTS_NOINDEX: process.env.ROBOTS_NOINDEX,
});

const withNextIntl = createNextIntlPlugin();

export const INDEXABLE_HOST = '(www\\.)?marek\\.media';

export const VERCEL_PROD_HOST = 'mm-web-prod.vercel.app';
export const CANONICAL_ORIGIN = 'https://marek.media';

export const getRedirects = (enabled = process.env.ENABLE_DOMAIN_REDIRECTS === 'true') =>
   enabled
      ? [
           {
              source: '/',
              has: [{ type: 'host' as const, value: VERCEL_PROD_HOST }],
              destination: `${CANONICAL_ORIGIN}/`,
              permanent: true,
           },
           {
              source: '/:path((?!api(?:/|$)|_next(?:/|$)).+)',
              has: [{ type: 'host' as const, value: VERCEL_PROD_HOST }],
              destination: `${CANONICAL_ORIGIN}/:path`,
              permanent: true,
           },
        ]
      : [];

export const getHeaders = () => [
   {
      source: '/:path*',
      missing: [{ type: 'host' as const, value: INDEXABLE_HOST }],
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
   },
   {
      source: '/:path*',
      headers: [
         { key: 'X-Content-Type-Options', value: 'nosniff' },
         { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
         { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
   },
   ...(env.ROBOTS_NOINDEX === 'true'
      ? [
           {
              source: '/:path*',
              headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
           },
        ]
      : []),
];

const nextConfig: NextConfig = {
   images: {
      remotePatterns: [
         {
            protocol: 'https',
            hostname: '*.r2.dev',
         },
         ...(process.env.NODE_ENV === 'production'
            ? []
            : [
                 {
                    protocol: 'http' as const,
                    hostname: 'localhost',
                    port: '9090',
                    pathname: '/mm-media/**',
                 },
              ]),
      ],
   },
   webpack(config) {
      config.module.rules.push({
         test: /\.svg$/,
         use: [
            {
               loader: '@svgr/webpack',
               options: {
                  icon: false,
                  svgo: true,
                  svgoConfig: {
                     plugins: [
                        {
                           name: 'preset-default',
                           params: {
                              overrides: {
                                 removeViewBox: false,
                                 removeHiddenElems: false,
                              },
                           },
                        },
                     ],
                  },
               },
            },
         ],
      });
      return config;
   },
   turbopack: {
      rules: {
         '*.svg': {
            loaders: [
               {
                  loader: '@svgr/webpack',
                  options: {
                     icon: false,
                     svgo: true,
                     svgoConfig: {
                        plugins: [
                           {
                              name: 'preset-default',
                              params: {
                                 overrides: {
                                    removeViewBox: false,
                                    removeHiddenElems: false,
                                 },
                              },
                           },
                        ],
                     },
                  },
               },
            ],
            as: '*.js',
         },
      },
   },
   async redirects() {
      return getRedirects();
   },
   async headers() {
      return getHeaders();
   },
};

export default withNextIntl(nextConfig);
