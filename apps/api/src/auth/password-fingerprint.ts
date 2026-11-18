import { createHmac, timingSafeEqual } from 'crypto';

export type FingerprintPurpose = 'session' | 'password-reset';

export const passwordFingerprint = (
   secret: string,
   purpose: FingerprintPurpose,
   passwordHash: string,
): string => createHmac('sha256', secret).update(`${purpose}:${passwordHash}`).digest('base64url');

export const matchesFingerprint = (claim: unknown, expected: string): boolean => {
   if (typeof claim !== 'string') return false;
   const left = Buffer.from(claim);
   const right = Buffer.from(expected);
   return left.length === right.length && timingSafeEqual(left, right);
};
