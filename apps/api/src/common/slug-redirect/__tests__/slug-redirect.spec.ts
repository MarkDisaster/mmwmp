import { EntityStatus, SlugRedirectResource } from '@/generated/prisma/enums';

import { deleteSlugRedirects, findRedirectSlug, syncSlugRedirects } from '../slug-redirect';

const tx = () => ({
   slugRedirect: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
   },
   project: { findFirst: jest.fn() },
   service: { findFirst: jest.fn() },
});

describe('syncSlugRedirects', () => {
   const run = (
      client: ReturnType<typeof tx>,
      target: Parameters<typeof syncSlugRedirects>[2],
      resource: SlugRedirectResource = SlugRedirectResource.project,
   ) => syncSlugRedirects(client as never, resource, target);

   it('records the old slug of a published row that is renamed', async () => {
      const client = tx();

      await run(client, { id: 4, oldSlug: 'old', newSlug: 'new', wasPublished: true });

      expect(client.slugRedirect.upsert).toHaveBeenCalledWith({
         where: { resource_oldSlug: { resource: 'project', oldSlug: 'old' } },
         create: { resource: 'project', oldSlug: 'old', targetId: 4 },
         update: { targetId: 4 },
      });
   });

   it('always clears a redirect from the slug the row has now', async () => {
      const client = tx();

      await run(client, { id: 4, oldSlug: 'same', newSlug: 'same', wasPublished: true });

      expect(client.slugRedirect.deleteMany).toHaveBeenCalledWith({
         where: { resource: 'project', oldSlug: 'same' },
      });
      expect(client.slugRedirect.upsert).not.toHaveBeenCalled();
   });

   it.each([
      ['a draft', { oldSlug: 'old', wasPublished: false }],
      ['a new row', { oldSlug: null, wasPublished: false }],
      ['an unchanged slug', { oldSlug: 'new', wasPublished: true }],
   ])('writes no redirect for %s', async (_name, rest) => {
      const client = tx();

      await run(client, { id: 4, newSlug: 'new', ...rest });

      expect(client.slugRedirect.upsert).not.toHaveBeenCalled();
   });

   it('uses the resource it is given', async () => {
      const client = tx();

      await run(
         client,
         { id: 9, oldSlug: 'old', newSlug: 'new', wasPublished: true },
         SlugRedirectResource.service,
      );

      expect(client.slugRedirect.upsert).toHaveBeenCalledWith(
         expect.objectContaining({ create: expect.objectContaining({ resource: 'service' }) }),
      );
   });
});

describe('deleteSlugRedirects', () => {
   it('deletes the redirects that point to the row', async () => {
      const client = tx();

      await deleteSlugRedirects(client as never, SlugRedirectResource.service, 3);

      expect(client.slugRedirect.deleteMany).toHaveBeenCalledWith({
         where: { resource: 'service', targetId: 3 },
      });
   });
});

describe('findRedirectSlug', () => {
   it('returns null without a redirect', async () => {
      const client = tx();
      client.slugRedirect.findUnique.mockResolvedValue(null);

      await expect(
         findRedirectSlug(client as never, SlugRedirectResource.project, 'old'),
      ).resolves.toBeNull();
   });

   it('returns the slug of the published target of the right resource', async () => {
      const client = tx();
      client.slugRedirect.findUnique.mockResolvedValue({ targetId: 5 });
      client.service.findFirst.mockResolvedValue({ slug: 'current' });

      await expect(
         findRedirectSlug(client as never, SlugRedirectResource.service, 'old'),
      ).resolves.toBe('current');
      expect(client.service.findFirst).toHaveBeenCalledWith({
         where: { id: 5, status: EntityStatus.published, deletedAt: null },
         select: { slug: true },
      });
      expect(client.project.findFirst).not.toHaveBeenCalled();
   });

   it('returns null when the target is not published', async () => {
      const client = tx();
      client.slugRedirect.findUnique.mockResolvedValue({ targetId: 5 });
      client.project.findFirst.mockResolvedValue(null);

      await expect(
         findRedirectSlug(client as never, SlugRedirectResource.project, 'old'),
      ).resolves.toBeNull();
   });
});
