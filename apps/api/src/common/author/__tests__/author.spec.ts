import { of } from 'rxjs';

import { type AuthorViewer, canReadUserEmails, redactAuthorEmails } from '../author';
import { AuthorPrivacyInterceptor } from '../author-privacy.interceptor';

const viewer = (id: number, permissions: string[] = [], isAdmin = false): AuthorViewer => ({
   id,
   role: {
      isAdmin,
      permissions: permissions.map((p) => {
         const [resource, action] = p.split('.');
         return { resource, action };
      }),
   },
});

const author = { id: 9, firstName: 'Jan', lastName: 'Novák', email: 'jan@example.com' };
const withoutEmail = { id: 9, firstName: 'Jan', lastName: 'Novák' };

describe('canReadUserEmails', () => {
   it('allows an admin and a role with users.read, nobody else', () => {
      expect(canReadUserEmails(viewer(1, [], true))).toBe(true);
      expect(canReadUserEmails(viewer(1, ['users.read']))).toBe(true);
      expect(canReadUserEmails(viewer(1, ['projects.read', 'users.update']))).toBe(false);
      expect(canReadUserEmails(null)).toBe(false);
      expect(canReadUserEmails(undefined)).toBe(false);
   });
});

describe('redactAuthorEmails', () => {
   const page = {
      data: [
         { id: 1, title: 'A', createdBy: author, createdAt: new Date(0) },
         { id: 2, title: 'B', createdBy: null },
      ],
      totalCount: 2,
   };

   it('removes the e-mail of every embedded createdBy and user for a role without users.read', () => {
      const entry = {
         id: 5,
         action: 'project.update',
         user: { ...author, role: { isAdmin: false } },
      };

      expect(redactAuthorEmails(page, viewer(1, ['projects.read']))).toEqual({
         data: [
            { id: 1, title: 'A', createdBy: withoutEmail, createdAt: new Date(0) },
            { id: 2, title: 'B', createdBy: null },
         ],
         totalCount: 2,
      });
      expect(redactAuthorEmails([entry], viewer(1, ['audit.read']))).toEqual([
         { ...entry, user: { ...withoutEmail, role: { isAdmin: false } } },
      ]);
   });

   it('reaches nested records (a file inside a project)', () => {
      const project = {
         id: 1,
         thumbnail: { id: 3, createdBy: author },
         media: [{ file: { createdBy: author } }],
      };

      expect(redactAuthorEmails(project, viewer(1))).toEqual({
         id: 1,
         thumbnail: { id: 3, createdBy: withoutEmail },
         media: [{ file: { createdBy: withoutEmail } }],
      });
   });

   it('keeps the e-mail for an admin, a role with users.read and the author themselves', () => {
      expect(redactAuthorEmails(page, viewer(1, [], true))).toBe(page);
      expect(redactAuthorEmails(page, viewer(1, ['users.read']))).toBe(page);
      expect(redactAuthorEmails(page, viewer(author.id, ['projects.read']))).toEqual(page);
   });

   it('removes the e-mail for an anonymous caller (public routes)', () => {
      expect(redactAuthorEmails({ createdBy: author }, undefined)).toEqual({
         createdBy: withoutEmail,
      });
   });

   it('never mutates the value and returns unchanged branches as they are', () => {
      const original = structuredClone(page);
      const result = redactAuthorEmails(page, viewer(1));

      expect(page).toEqual(original);
      expect(result.data[1]).toBe(page.data[1]);
      expect(result.data[0].createdAt).toBe(page.data[0].createdAt);
   });

   it('leaves the e-mail of a top-level user and of other keys alone', () => {
      const me = { id: 9, email: 'jan@example.com', contact: { email: 'info@example.com' } };

      expect(redactAuthorEmails(me, viewer(1))).toBe(me);
   });

   it('passes non-plain values through', () => {
      const buffer = Buffer.from('x');

      expect(redactAuthorEmails(buffer, viewer(1))).toBe(buffer);
      expect(redactAuthorEmails(undefined, viewer(1))).toBeUndefined();
      expect(redactAuthorEmails('text', viewer(1))).toBe('text');
   });
});

describe('AuthorPrivacyInterceptor', () => {
   const run = async (user: AuthorViewer, body: unknown, type = 'http') => {
      const context = {
         getType: () => type,
         switchToHttp: () => ({ getRequest: () => ({ user }) }),
      };
      const result = new AuthorPrivacyInterceptor().intercept(context as never, {
         handle: () => of(body),
      });
      return new Promise((resolve) => result.subscribe(resolve));
   };

   it('redacts the response for the request user', async () => {
      await expect(run(viewer(1, ['tags.read']), { createdBy: author })).resolves.toEqual({
         createdBy: withoutEmail,
      });
      await expect(run(viewer(1, ['users.read']), { createdBy: author })).resolves.toEqual({
         createdBy: author,
      });
   });

   it('leaves non-HTTP handlers alone', async () => {
      await expect(run(undefined, { createdBy: author }, 'rpc')).resolves.toEqual({
         createdBy: author,
      });
   });
});
