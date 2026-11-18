import { extractBearerToken } from '../access-token';

const request = (authorization?: string) => ({
   headers: authorization === undefined ? {} : { authorization },
});

describe('extractBearerToken', () => {
   it.each(['Bearer abc.def', 'bearer abc.def', 'BEARER abc.def', 'Bearer   abc.def'])(
      'reads the token of %p',
      (header) => {
         expect(extractBearerToken(request(header))).toBe('abc.def');
      },
   );

   it.each([undefined, '', 'Bearer', 'Bearer ', 'Basic abc.def', 'Bearer abc def', 'Bearerabc'])(
      'reads no token from %p',
      (header) => {
         expect(extractBearerToken(request(header))).toBeUndefined();
      },
   );
});
