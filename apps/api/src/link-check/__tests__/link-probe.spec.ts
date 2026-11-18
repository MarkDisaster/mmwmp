import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { BlockedAddressError } from '../ip-guard';
import { createSender, MAX_REDIRECTS, probeLink, type SendRequest } from '../link-probe';

const url = (raw: string) => new URL(raw);

const scripted = (answers: Record<string, ({ status: number; location?: string } | Error)[]>) => {
   const calls: string[] = [];
   const send: SendRequest = (target, method) => {
      const key = `${method} ${target.host}${target.pathname}`;
      calls.push(key);
      const answer = answers[key]?.shift();
      if (!answer) return Promise.reject(new Error(`unexpected request ${key}`));
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
   };
   return { send, calls };
};

describe('probeLink', () => {
   it('is ok for a 2xx answer to HEAD and sends nothing else', async () => {
      const { send, calls } = scripted({ 'HEAD example.com/': [{ status: 200 }] });

      expect(await probeLink(url('https://example.com/'), send)).toEqual({
         status: 'ok',
         httpStatus: 200,
         redirects: 0,
      });
      expect(calls).toEqual(['HEAD example.com/']);
   });

   it('repeats a refused HEAD as a limited GET and trusts the GET', async () => {
      const { send, calls } = scripted({
         'HEAD example.com/': [{ status: 405 }],
         'GET example.com/': [{ status: 206 }],
      });

      expect(await probeLink(url('https://example.com/'), send)).toMatchObject({
         status: 'ok',
         httpStatus: 206,
      });
      expect(calls).toEqual(['HEAD example.com/', 'GET example.com/']);
   });

   it.each([404, 410])('calls %i broken', async (status) => {
      const { send } = scripted({
         'HEAD example.com/': [{ status }],
         'GET example.com/': [{ status }],
      });

      expect(await probeLink(url('https://example.com/'), send)).toMatchObject({
         status: 'broken',
         httpStatus: status,
      });
   });

   it.each([401, 403, 429, 500, 503])(
      'calls %i "could not be verified", not dead (sites refuse robots)',
      async (status) => {
         const { send } = scripted({
            'HEAD example.com/': [{ status }],
            'GET example.com/': [{ status }],
         });

         expect(await probeLink(url('https://example.com/'), send)).toMatchObject({
            status: 'error',
            httpStatus: status,
         });
      },
   );

   it.each([301, 308])(
      'reports a chain of permanent redirects (%i) as moved, with the final URL',
      async (status) => {
         const { send } = scripted({
            'HEAD example.com/a': [{ status, location: '/b' }],
            'HEAD example.com/b': [{ status, location: 'https://www.example.com/c' }],
            'HEAD www.example.com/c': [{ status: 200 }],
         });

         expect(await probeLink(url('https://example.com/a'), send)).toEqual({
            status: 'redirect',
            httpStatus: 200,
            finalUrl: 'https://www.example.com/c',
            redirects: 2,
         });
      },
   );

   it.each([302, 303, 307])(
      'reports a temporary redirect (%i) as temporary, never as moved',
      async (status) => {
         const { send } = scripted({
            'HEAD example.com/a': [{ status: 301, location: '/b' }],
            'HEAD example.com/b': [{ status, location: 'https://www.example.com/c' }],
            'HEAD www.example.com/c': [{ status: 200 }],
         });

         expect(await probeLink(url('https://example.com/a'), send)).toMatchObject({
            status: 'temporary',
            finalUrl: 'https://www.example.com/c',
            redirects: 2,
         });
      },
   );

   it('stops after the redirect limit', async () => {
      const hops = Object.fromEntries(
         Array.from({ length: MAX_REDIRECTS + 1 }, (_, i) => [
            `HEAD example.com/${i}`,
            [{ status: 302, location: `/${i + 1}` }],
         ]),
      );
      const { send, calls } = scripted(hops);

      expect(await probeLink(url('https://example.com/0'), send)).toMatchObject({
         status: 'error',
         redirects: MAX_REDIRECTS,
         reason: `More than ${MAX_REDIRECTS} redirects`,
      });
      expect(calls).toHaveLength(MAX_REDIRECTS + 1);
   });

   it('does not loop for ever on a redirect to itself', async () => {
      const { send, calls } = scripted({
         'HEAD example.com/loop': Array.from({ length: 10 }, () => ({
            status: 302,
            location: '/loop',
         })),
      });

      expect((await probeLink(url('https://example.com/loop'), send)).status).toBe('error');
      expect(calls.length).toBeLessThanOrEqual(MAX_REDIRECTS + 1);
   });

   describe('a redirect to somewhere the checker must not go is blocked and never requested', () => {
      it.each([
         ['cloud metadata', 'http://169.254.169.254/latest/meta-data/'],
         ['loopback', 'http://127.0.0.1/admin'],
         ['loopback, decimal', 'http://2130706433/'],
         ['IPv6 loopback', 'http://[::1]/'],
         ['IPv4-mapped metadata', 'http://[::ffff:169.254.169.254]/'],
         ['localhost', 'http://localhost/'],
         ['a private address', 'https://10.0.0.1/'],
         ['another scheme', 'file:///etc/passwd'],
         ['another scheme', 'gopher://example.org/'],
         ['credentials', 'https://user:pass@example.org/'],
         ['a port', 'http://example.org:6379/'],
         ['a protocol-relative internal host', '//127.0.0.1/'],
      ])('%s: %s', async (_name, location) => {
         const { send, calls } = scripted({
            'HEAD example.com/': [{ status: 302, location }],
         });

         const result = await probeLink(url('https://example.com/'), send);

         expect(result.status).toBe('blocked');
         expect(result.reason).toMatch(/^Redirect: /);
         expect(calls).toEqual(['HEAD example.com/']);
      });

      it('also on the last allowed hop', async () => {
         const { send, calls } = scripted({
            'HEAD example.com/1': [{ status: 301, location: '/2' }],
            'HEAD example.com/2': [{ status: 301, location: '/3' }],
            'HEAD example.com/3': [{ status: 301, location: 'http://192.168.1.1/' }],
         });

         expect((await probeLink(url('https://example.com/1'), send)).status).toBe('blocked');
         expect(calls).toHaveLength(3);
      });
   });

   it('says a redirect without a usable target is an error', async () => {
      const { send } = scripted({
         'HEAD example.com/': [{ status: 302, location: 'http://[bad' }],
      });

      expect((await probeLink(url('https://example.com/'), send)).status).toBe('error');
   });

   it('maps the failures of the request to a status, with no message of the network', async () => {
      const failing = (error: Error) => scripted({ 'HEAD example.com/': [error] }).send;
      const coded = (code: string) =>
         Object.assign(new Error(`secret detail 10.1.2.3 ${code}`), { code });

      expect(
         await probeLink(url('https://example.com/'), failing(new BlockedAddressError('x'))),
      ).toMatchObject({
         status: 'blocked',
      });
      expect(
         await probeLink(url('https://example.com/'), failing(coded('ENOTFOUND'))),
      ).toMatchObject({
         status: 'broken',
      });
      const refused = await probeLink(url('https://example.com/'), failing(coded('ECONNREFUSED')));
      expect(refused).toEqual({
         status: 'error',
         redirects: 0,
         reason: 'Connection failed (ECONNREFUSED)',
      });
      expect(JSON.stringify(refused)).not.toContain('10.1.2.3');
      expect(
         await probeLink(
            url('https://example.com/'),
            failing(Object.assign(new Error('aborted'), { name: 'AbortError' })),
         ),
      ).toMatchObject({ status: 'error', reason: 'Timed out' });
   });
});

describe('createSender against a real socket', () => {
   let server: http.Server;
   let port: number;
   let seen: http.IncomingMessage[];
   let connections: number;

   beforeEach(async () => {
      seen = [];
      connections = 0;
      server = http.createServer((request, response) => {
         seen.push(request);
         if (request.url === '/moved') {
            response.writeHead(301, { Location: '/target', 'Set-Cookie': 'a=b' });
            return response.end('moved body');
         }
         response.writeHead(200, { 'Content-Type': 'text/plain' });
         response.end('a very long body'.repeat(1000));
      });
      server.on('connection', () => (connections += 1));
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      port = (server.address() as AddressInfo).port;
   });

   afterEach(async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
   });

   const toLoopback = ((
      _host: string,
      options: { all?: boolean },
      callback: (...a: unknown[]) => void,
   ) =>
      options.all
         ? callback(null, [{ address: '127.0.0.1', family: 4 }])
         : callback(null, '127.0.0.1', 4)) as never;
   const target = (path: string) => new URL(`http://test-host.example:${port}${path}`);

   it('sends fixed headers only: no cookie, no authorization, a one-byte Range on GET', async () => {
      const send = createSender(toLoopback);
      const signal = AbortSignal.timeout(5000);

      await send(target('/page'), 'GET', signal);
      await send(target('/page'), 'HEAD', signal);

      const [get, head] = seen;
      expect(Object.keys(get.headers).sort()).toEqual(
         ['accept', 'connection', 'host', 'range', 'user-agent'].sort(),
      );
      expect(get.headers.range).toBe('bytes=0-0');
      expect(get.headers['user-agent']).toContain('MarekMediaLinkChecker');
      expect(head.method).toBe('HEAD');
      expect(head.headers.range).toBeUndefined();
      expect(head.headers.cookie).toBeUndefined();
      expect(head.headers.authorization).toBeUndefined();
   });

   it('returns the status and the Location only, and does not follow the redirect itself', async () => {
      const result = await createSender(toLoopback)(
         target('/moved'),
         'HEAD',
         AbortSignal.timeout(5000),
      );

      expect(result).toEqual({ status: 301, location: '/target' });
      expect(seen).toHaveLength(1);
   });

   it('gives up on a server that does not answer', async () => {
      const silent = http.createServer();
      await new Promise<void>((resolve) => silent.listen(0, '127.0.0.1', resolve));
      const silentPort = (silent.address() as AddressInfo).port;
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 100);

      await expect(
         createSender(toLoopback)(
            new URL(`http://test-host.example:${silentPort}/`),
            'HEAD',
            controller.signal,
         ),
      ).rejects.toMatchObject({ name: 'AbortError' });
      silent.closeAllConnections();
      await new Promise((resolve) => silent.close(resolve));
   });

   it('refuses to connect to a loopback server with the default guarded lookup', async () => {
      const result = await probeLink(new URL(`http://localhost:${port}/`));

      expect(result.status).toBe('blocked');
      expect(connections).toBe(0);
      expect(seen).toHaveLength(0);
   });
});
