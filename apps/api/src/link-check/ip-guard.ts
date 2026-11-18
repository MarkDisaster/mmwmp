import dns from 'node:dns';
import net from 'node:net';

import ipaddr from 'ipaddr.js';

const EXTRA_DENIED_IPV4 = ['168.63.129.16'] as const;

const GLOBAL_UNICAST_IPV6 = ipaddr.parseCIDR('2000::/3');

export const isPublicAddress = (address: string): boolean => {
   if (!ipaddr.isValid(address)) return false;
   const parsed = ipaddr.parse(address);

   if (parsed.kind() === 'ipv6') {
      const v6 = parsed as ipaddr.IPv6;
      if (!v6.match(GLOBAL_UNICAST_IPV6)) return false;
      return v6.range() === 'unicast';
   }

   if (parsed.range() !== 'unicast') return false;
   return !EXTRA_DENIED_IPV4.includes(parsed.toString() as (typeof EXTRA_DENIED_IPV4)[number]);
};

export class BlockedAddressError extends Error {
   readonly code = 'ERR_BLOCKED_ADDRESS';

   constructor(host: string) {
      super(`${host} resolves to a non-public address`);
      this.name = 'BlockedAddressError';
   }
}

type LookupCallback = (
   error: NodeJS.ErrnoException | null,
   address: string | dns.LookupAddress[],
   family?: number,
) => void;

type Resolver = (
   hostname: string,
   options: dns.LookupAllOptions,
   callback: (error: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void,
) => void;

export const createGuardedLookup =
   (resolve: Resolver = dns.lookup as unknown as Resolver) =>
   (hostname: string, options: dns.LookupOptions, callback: LookupCallback): void => {
      if (net.isIP(hostname) !== 0) {
         if (!isPublicAddress(hostname)) return callback(new BlockedAddressError(hostname), '');
         const family = net.isIP(hostname);
         if (options.all) return callback(null, [{ address: hostname, family }]);
         return callback(null, hostname, family);
      }

      resolve(hostname, { ...options, all: true }, (error, addresses) => {
         if (error) return callback(error, '');
         if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
            return callback(new BlockedAddressError(hostname), '');
         }
         if (options.all) return callback(null, addresses);
         return callback(null, addresses[0].address, addresses[0].family);
      });
   };
