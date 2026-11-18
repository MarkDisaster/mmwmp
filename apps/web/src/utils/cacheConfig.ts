import { env } from '@/env';

export const CACHE_TAGS = ['services', 'projects', 'contact', 'tags'] as const;
export type CacheTag = (typeof CACHE_TAGS)[number];

const REVALIDATE_SECONDS = process.env.NODE_ENV === 'production' ? 86400 : 60;

export function cacheOptions(...tags: CacheTag[]) {
   return { revalidate: REVALIDATE_SECONDS, tags };
}

export const buildId = env.VERCEL_GIT_COMMIT_SHA ?? 'dev';
