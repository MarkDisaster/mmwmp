import { createHmac } from 'crypto';

export const PREVIEW_TOKEN_TTL_SECONDS = 5 * 60;

export type PreviewResource = 'projects' | 'services';

export type PreviewTokenPayload = {
   resource: PreviewResource;
   id: number;
   slug: string;
   locale: string;
   exp: number;
};

export const signPreviewToken = (payload: PreviewTokenPayload, key: string): string => {
   const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
   const signature = createHmac('sha256', key).update(body).digest('base64url');
   return `${body}.${signature}`;
};
