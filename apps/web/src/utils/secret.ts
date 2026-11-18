import { createHash, timingSafeEqual } from 'crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

export const isSecretValid = (received: string, expected: string): boolean =>
   expected.length > 0 && timingSafeEqual(digest(received), digest(expected));
