import { minutes } from '@nestjs/throttler';

export const GLOBAL_THROTTLE = { ttl: minutes(1), limit: 60 };

export const PUBLIC_READ_THROTTLE = { ttl: minutes(1), limit: 300 };
