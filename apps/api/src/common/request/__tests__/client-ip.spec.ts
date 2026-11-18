import type { Request } from 'express';

import { clientIp } from '../client-ip';

const request = (headers: Request['headers'], ip?: string) =>
   ({ headers, ip, socket: { remoteAddress: '10.0.0.1' } }) as unknown as Request;

describe('clientIp', () => {
   it('returns X-Real-IP and ignores X-Forwarded-For', () => {
      const req = request(
         { 'x-real-ip': '198.51.100.7', 'x-forwarded-for': '203.0.113.7, 152.233.0.1' },
         '152.233.0.1',
      );

      expect(clientIp(req)).toBe('198.51.100.7');
   });

   it('accepts an IPv6 X-Real-IP with surrounding spaces', () => {
      expect(clientIp(request({ 'x-real-ip': ' 2001:db8::1 ' }, '10.0.0.2'))).toBe('2001:db8::1');
   });

   it('falls back to req.ip without X-Real-IP', () => {
      expect(clientIp(request({ 'x-forwarded-for': '203.0.113.7' }, '10.0.0.2'))).toBe('10.0.0.2');
   });

   it('falls back to req.ip when X-Real-IP is not an address', () => {
      expect(clientIp(request({ 'x-real-ip': '198.51.100.7, 203.0.113.7' }, '10.0.0.2'))).toBe(
         '10.0.0.2',
      );
   });

   it('falls back to the socket address without req.ip', () => {
      expect(clientIp(request({}))).toBe('10.0.0.1');
   });

   it('returns null without any address', () => {
      const req = { headers: {}, socket: {} } as unknown as Request;

      expect(clientIp(req)).toBeNull();
   });
});
