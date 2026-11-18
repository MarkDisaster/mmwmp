import { AxiosError } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { contactPublicControllerFind } from '@/api/generated/clients/contactPublicControllerFind';

import { getContact } from '../api/getContact';
import { ContactSection } from '../components/ContactSection';

vi.mock('@/env', () => ({ env: {} }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }));
vi.mock('next-intl/server', () => ({ getLocale: async () => 'cs', getTranslations: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: () => null }));
vi.mock('@/api/generated/clients/contactPublicControllerFind', () => ({
   contactPublicControllerFind: vi.fn(),
}));

const findContact = vi.mocked(contactPublicControllerFind);

describe('getContact', () => {
   beforeEach(() => {
      findContact.mockReset();
   });

   it('returns the contact', async () => {
      const contact = { id: 1, email: 'hello@example.test', translations: [] };
      findContact.mockResolvedValue({ data: contact } as never);

      expect(await getContact()).toEqual(contact);
   });

   it('returns null for the empty body the API sends when no contact is saved', async () => {
      findContact.mockResolvedValue({ data: '' } as never);

      expect(await getContact()).toBeNull();
   });

   it('lets a 404 propagate, so a wrong API route is not cached as a missing contact', async () => {
      const notFound = new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
         status: 404,
      } as never);
      findContact.mockRejectedValue(notFound);

      await expect(getContact()).rejects.toBe(notFound);
   });
});

describe('ContactSection', () => {
   it('renders nothing without a contact, so it does not link to the 404 contact page', async () => {
      expect(await ContactSection({ contact: null })).toBeNull();
   });
});
