import { redactUrl } from '../redact-url';

describe('redactUrl', () => {
   it('replaces the token of an invitation and drops the query', () => {
      expect(redactUrl('/users/invitations/abc123/accept?x=1')).toBe(
         '/users/invitations/[token]/accept',
      );
      expect(redactUrl('https://api.example.com/users/invitations/abc123')).toBe(
         'https://api.example.com/users/invitations/[token]',
      );
   });

   it('drops the query and the fragment of any other address and keeps the path', () => {
      expect(redactUrl('/public/projects?search=jana%40example.cz#x')).toBe('/public/projects');
   });

   it('leaves an address without a secret as it is', () => {
      expect(redactUrl('/projects/12/tags')).toBe('/projects/12/tags');
   });
});
