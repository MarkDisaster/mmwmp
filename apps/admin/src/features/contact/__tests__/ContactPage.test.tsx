import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { queryKeys } from '@/api/endpoints/contact';
import type { ContactEntity } from '@/api/generated';
import { signInAs } from '@/test/auth';
import { createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { ContactPage } from '../components/ContactPage';

const upsert = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { mutations } = actual.api.contact;
   return {
      ...actual,
      api: {
         ...actual.api,
         contact: {
            ...actual.api.contact,
            mutations: { ...mutations, upsert: { ...mutations.upsert, mutationFn: upsert } },
         },
      },
   };
});

const TIMESTAMP = '2026-01-01T00:00:00.000Z';
const COMPANY = 'Company name';
const SAVE = 'Save';
const TYPED = 'Marek Media 2';

const contact = (overrides: Partial<ContactEntity> = {}): ContactEntity => ({
   id: 1,
   companyName: 'Marek Media',
   vatPayer: false,
   translations: [],
   createdAt: TIMESTAMP,
   updatedAt: TIMESTAMP,
   version: 0,
   ...overrides,
});

describe('ContactPage version', () => {
   beforeEach(() => {
      upsert.mockReset();
      vi.mocked(toast.error).mockClear();
      queryClient.clear();
      queryClient.setQueryData(queryKeys.detail, contact());
      signInAs(createUser(createRole(['contact.read', 'contact.update'])));
   });

   const renderPage = async () => {
      render(<ContactPage />, { wrapper: QueryWrapper });
      const user = userEvent.setup();
      const input = await screen.findByRole('textbox', { name: COMPANY });
      return { user, input };
   };

   it('should send the version of the contact and keep the input after a stale one', async () => {
      upsert.mockRejectedValue(
         new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 409,
            data: { message: 'changed', code: 'VERSION_CONFLICT', currentVersion: 1 },
         } as AxiosResponse),
      );
      const { user, input } = await renderPage();

      await user.type(input, ' 2');
      await user.click(screen.getByRole('button', { name: SAVE }));

      expect(
         await screen.findByRole('alertdialog', { name: 'This record changed in the meantime' }),
      ).toBeInTheDocument();
      expect(upsert.mock.calls[0][0].data.version).toBe(0);
      expect(toast.error).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox', { name: COMPANY, hidden: true })).toHaveValue(TYPED);
   });

   it('should keep the input and offer a reload when the contact changes under it', async () => {
      upsert.mockResolvedValue(contact({ version: 1 }));
      const { user, input } = await renderPage();

      await user.type(input, ' 2');
      act(() => {
         queryClient.setQueryData(queryKeys.detail, contact({ version: 1, city: 'Brno' }));
      });

      expect(
         await screen.findByRole('button', { name: 'Load current version' }),
      ).toBeInTheDocument();
      expect(input).toHaveValue(TYPED);

      await user.click(screen.getByRole('button', { name: SAVE }));
      await waitFor(() => expect(upsert).toHaveBeenCalled());
      expect(upsert.mock.calls[0][0].data.version).toBe(0);
   });

   it('should send the stored version with the next save', async () => {
      upsert.mockResolvedValue(contact({ version: 1, companyName: TYPED }));
      const { user, input } = await renderPage();

      await user.type(input, ' 2');
      await user.click(screen.getByRole('button', { name: SAVE }));
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      await user.type(input, '3');
      await user.click(screen.getByRole('button', { name: SAVE }));

      await waitFor(() => expect(upsert).toHaveBeenCalledTimes(2));
      expect(upsert.mock.calls[1][0].data.version).toBe(1);
   });
});
