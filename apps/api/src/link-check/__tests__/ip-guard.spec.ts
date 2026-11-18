import { BlockedAddressError, createGuardedLookup, isPublicAddress } from '../ip-guard';

describe('isPublicAddress', () => {
   it.each([
      '8.8.8.8',
      '1.1.1.1',
      '93.184.216.34',
      '172.15.255.255',
      '172.32.0.1',
      '100.63.255.255',
      '100.128.0.1',
      '2606:4700:4700::1111',
      '2a00:1450:4001:81b::200e',
   ])('allows the public address %s', (address) => {
      expect(isPublicAddress(address)).toBe(true);
   });

   it.each([
      ['loopback', '127.0.0.1'],
      ['loopback range', '127.255.255.254'],
      ['unspecified', '0.0.0.0'],
      ['"this network"', '0.1.2.3'],
      ['private 10/8', '10.0.0.1'],
      ['private 172.16/12 start', '172.16.0.1'],
      ['private 172.16/12 end', '172.31.255.255'],
      ['private 192.168/16', '192.168.1.1'],
      ['link-local / AWS, GCP, Azure metadata', '169.254.169.254'],
      ['ECS task metadata', '169.254.170.2'],
      ['carrier-grade NAT / Alibaba metadata', '100.100.100.200'],
      ['carrier-grade NAT start', '100.64.0.1'],
      ['Oracle metadata (192.0.0.0/24)', '192.0.0.192'],
      ['Azure wire server', '168.63.129.16'],
      ['TEST-NET-1', '192.0.2.1'],
      ['benchmarking', '198.18.0.1'],
      ['multicast', '224.0.0.1'],
      ['reserved 240/4', '240.0.0.1'],
      ['broadcast', '255.255.255.255'],
   ])('refuses IPv4 %s (%s)', (_name, address) => {
      expect(isPublicAddress(address)).toBe(false);
   });

   it.each([
      ['loopback', '::1'],
      ['unspecified', '::'],
      ['unique local fc00::/7', 'fc00::1'],
      ['unique local fd (AWS IPv6 metadata)', 'fd00:ec2::254'],
      ['link-local', 'fe80::1'],
      ['link-local with scope', 'fe80::1%eth0'],
      ['multicast', 'ff02::1'],
      ['documentation', '2001:db8::1'],
      ['Teredo', '2001::1'],
      ['6to4 of 127.0.0.1', '2002:7f00:1::'],
      ['NAT64 of 127.0.0.1', '64:ff9b::7f00:1'],
      ['NAT64 of a public IPv4', '64:ff9b::808:808'],
      ['discard-only', '100::1'],
      ['outside 2000::/3, unicast for ipaddr.js', '::2'],
      ['outside 2000::/3', '4000::1'],
   ])('refuses IPv6 %s (%s)', (_name, address) => {
      expect(isPublicAddress(address)).toBe(false);
   });

   it.each([
      ['mapped loopback', '::ffff:127.0.0.1'],
      ['mapped loopback hex', '::ffff:7f00:1'],
      ['mapped metadata', '::ffff:169.254.169.254'],
      ['mapped metadata hex', '::ffff:a9fe:a9fe'],
      ['mapped private', '::ffff:10.0.0.1'],
      ['mapped public (refused as well: normalise, never trust the form)', '::ffff:8.8.8.8'],
      ['IPv4-compatible loopback', '::127.0.0.1'],
      ['mapped with zone/odd zeros', '0:0:0:0:0:ffff:7f00:1'],
   ])('refuses the IPv4-in-IPv6 form: %s (%s)', (_name, address) => {
      expect(isPublicAddress(address)).toBe(false);
   });

   it.each(['', 'example.com', 'localhost', '999.1.1.1', '127.1', '2130706433', '0x7f.1'])(
      'refuses what is not a canonical IP literal: %j',
      (value) => {
         expect(isPublicAddress(value)).toBe(false);
      },
   );
});

describe('createGuardedLookup', () => {
   type Answer = { address: string; family: number }[];
   const resolver = (answer: Answer | Error) =>
      jest.fn((_host: string, _options: unknown, callback: (e: Error | null, a: Answer) => void) =>
         answer instanceof Error ? callback(answer, []) : callback(null, answer),
      );
   const call = (lookup: ReturnType<typeof createGuardedLookup>, host: string, all = false) =>
      new Promise<{ error: Error | null; address: unknown; family?: number }>((resolve) =>
         lookup(host, { all }, (error, address, family) => resolve({ error, address, family })),
      );

   it('hands the socket the validated addresses (the list form of autoSelectFamily)', async () => {
      const answer = [
         { address: '93.184.216.34', family: 4 },
         { address: '2606:2800:220:1::1', family: 6 },
      ];
      const lookup = createGuardedLookup(resolver(answer) as never);

      expect(await call(lookup, 'example.com', true)).toMatchObject({
         error: null,
         address: answer,
      });
   });

   it('hands the socket one validated address (the single form)', async () => {
      const lookup = createGuardedLookup(
         resolver([{ address: '93.184.216.34', family: 4 }]) as never,
      );

      expect(await call(lookup, 'example.com')).toEqual({
         error: null,
         address: '93.184.216.34',
         family: 4,
      });
   });

   it('refuses a name that resolves to a private address', async () => {
      const lookup = createGuardedLookup(resolver([{ address: '10.0.0.5', family: 4 }]) as never);

      const { error } = await call(lookup, 'internal.example.com', true);

      expect(error).toBeInstanceOf(BlockedAddressError);
      expect((error as BlockedAddressError).code).toBe('ERR_BLOCKED_ADDRESS');
   });

   it('refuses a name when ANY of its addresses is internal (a rebinding record next to a public one)', async () => {
      const lookup = createGuardedLookup(
         resolver([
            { address: '93.184.216.34', family: 4 },
            { address: '127.0.0.1', family: 4 },
         ]) as never,
      );

      expect((await call(lookup, 'rebind.example.com', true)).error).toBeInstanceOf(
         BlockedAddressError,
      );
      expect((await call(lookup, 'rebind.example.com', false)).error).toBeInstanceOf(
         BlockedAddressError,
      );
   });

   it('refuses an IPv6 answer that maps an internal IPv4 address', async () => {
      const lookup = createGuardedLookup(
         resolver([{ address: '::ffff:169.254.169.254', family: 6 }]) as never,
      );

      expect((await call(lookup, 'mapped.example.com', true)).error).toBeInstanceOf(
         BlockedAddressError,
      );
   });

   it('refuses an empty answer and passes a resolver error on', async () => {
      expect(
         (await call(createGuardedLookup(resolver([]) as never), 'x.example.com')).error,
      ).toBeInstanceOf(BlockedAddressError);
      const failing = createGuardedLookup(resolver(new Error('ENOTFOUND')) as never);
      expect((await call(failing, 'x.example.com')).error?.message).toBe('ENOTFOUND');
   });

   it('judges an IP literal itself without a DNS query', async () => {
      const dns = resolver([{ address: '93.184.216.34', family: 4 }]);
      const lookup = createGuardedLookup(dns as never);

      expect((await call(lookup, '127.0.0.1')).error).toBeInstanceOf(BlockedAddressError);
      expect(await call(lookup, '8.8.8.8')).toEqual({ error: null, address: '8.8.8.8', family: 4 });
      expect(dns).not.toHaveBeenCalled();
   });

   it('answers an IP literal in the list shape when the caller asks for all addresses', async () => {
      const lookup = createGuardedLookup(resolver([]) as never);

      expect(await call(lookup, '8.8.8.8', true)).toMatchObject({
         error: null,
         address: [{ address: '8.8.8.8', family: 4 }],
      });
      expect(await call(lookup, '2606:4700:4700::1111', true)).toMatchObject({
         error: null,
         address: [{ address: '2606:4700:4700::1111', family: 6 }],
      });
      expect((await call(lookup, '10.0.0.1', true)).error).toBeInstanceOf(BlockedAddressError);
   });

   it('asks the resolver for all addresses, whatever the caller asked', async () => {
      const dns = resolver([{ address: '93.184.216.34', family: 4 }]);

      await call(createGuardedLookup(dns as never), 'example.com', false);

      expect(dns.mock.calls[0][1]).toMatchObject({ all: true });
   });
});
