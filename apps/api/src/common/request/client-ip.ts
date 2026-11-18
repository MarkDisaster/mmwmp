import { isIP } from 'node:net';

import type { Request } from 'express';

type ClientIpRequest = Pick<Request, 'headers' | 'ip' | 'socket'>;

export const clientIp = (req: ClientIpRequest): string | null => {
   const header = req.headers['x-real-ip'];
   const realIp = (Array.isArray(header) ? header[0] : header)?.trim();
   if (realIp && isIP(realIp)) return realIp;
   return req.ip ?? req.socket?.remoteAddress ?? null;
};
