import { useQuery } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/api';
import { queryKeys as tagKeys } from '@/api/endpoints/tags';
import type { TagEntity } from '@/api/generated';
import { TooltipProvider } from '@/components/ui/tooltip';
import { signInAs } from '@/test/auth';
import { createRole, createUser } from '@/test/fixtures';
import { QueryWrapper } from '@/test/QueryWrapper';
import { queryClient } from '@/utils/query-client';

import { TagFormDialog } from '../components/TagFormDialog';

const create = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { mutations } = actual.api.tags;
   return {
      ...actual,
      api: {
         ...actual.api,
         tags: {
            ...actual.api.tags,
            mutations: {
               ...mutations,
               create: { ...mutations.create, mutationFn: create },
               update: { ...mutations.update, mutationFn: update },
            },
         },
      },
   };
});

const CS_NAME = 'Případová studie';
const EN_NAME = 'Case study';
const SLUG = 'pripadova-studie';
const ENGLISH_TAB = 'English';
const REMOVE_ENGLISH = 'Remove language English';
const TIMESTAMP = '2026-01-01T00:00:00.000Z';

const tagOf = (translations: TagEntity['translations']): TagEntity => ({
   id: 7,
   translations,
   slug: SLUG,
   color: '#0130fe',
   sortOrder: 1,
   createdAt: TIMESTAMP,
   updatedAt: TIMESTAMP,
   version: 0,
   createdBy: null,
});

const CS_ONLY = tagOf([{ language: 'cs', name: CS_NAME }]);
const BOTH = tagOf([
   { language: 'cs', name: CS_NAME },
   { language: 'en', name: EN_NAME },
]);

const CZECH_NAME = 'Name (Czech)';
const ENGLISH_NAME = 'Name (English)';

describe('TagFormDialog translations', () => {
   beforeEach(() => {
      create.mockReset();
      update.mockReset();
      vi.mocked(toast.error).mockClear();
      create.mockResolvedValue(CS_ONLY);
      update.mockResolvedValue(BOTH);
      signInAs(createUser(createRole(['tags.read', 'tags.create', 'tags.update'])));
   });

   afterEach(() => {
      queryClient.clear();
   });

   const renderDialog = (tag?: TagEntity) => {
      const user = userEvent.setup();
      render(
         <TooltipProvider>
            <TagFormDialog open tag={tag} onClose={vi.fn()} />
         </TooltipProvider>,
         { wrapper: QueryWrapper },
      );
      return user;
   };

   it('should open a new tag with the Czech name and offer the English one', () => {
      renderDialog();

      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Czech' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: ENGLISH_TAB })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: ENGLISH_NAME })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Remove language/ })).not.toBeInTheDocument();
   });

   it('should create a tag with the Czech name only and derive the slug from it', async () => {
      const user = renderDialog();

      await user.type(screen.getByRole('textbox', { name: CZECH_NAME }), CS_NAME);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(create.mock.calls[0][0].data).toEqual({
         slug: SLUG,
         color: '#0130fe',
         translations: [{ language: 'cs', name: CS_NAME }],
      });
   });

   it('should add the English name with its tab and send both names', async () => {
      const user = renderDialog();

      await user.type(screen.getByRole('textbox', { name: CZECH_NAME }), CS_NAME);
      await user.click(screen.getByRole('button', { name: ENGLISH_TAB }));
      await user.type(screen.getByRole('textbox', { name: ENGLISH_NAME }), EN_NAME);
      await user.click(screen.getByRole('button', { name: 'Czech' }));
      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toHaveValue(CS_NAME);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(create.mock.calls[0][0].data.translations).toEqual([
         { language: 'cs', name: CS_NAME },
         { language: 'en', name: EN_NAME },
      ]);
   });

   it('should not save without the Czech name', async () => {
      const user = renderDialog();

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(screen.getByRole('textbox', { name: CZECH_NAME })).toBeInvalid());
      expect(create).not.toHaveBeenCalled();
   });

   it('should not save an added English tab left empty, and show that tab', async () => {
      const user = renderDialog();

      await user.type(screen.getByRole('textbox', { name: CZECH_NAME }), 'Studie');
      await user.click(screen.getByRole('button', { name: ENGLISH_TAB }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() =>
         expect(screen.getByRole('textbox', { name: ENGLISH_NAME })).toBeInvalid(),
      );
      expect(create).not.toHaveBeenCalled();
   });

   it('should remove the added English tab and send the Czech name only', async () => {
      const user = renderDialog();

      await user.type(screen.getByRole('textbox', { name: CZECH_NAME }), 'Studie');
      await user.click(screen.getByRole('button', { name: ENGLISH_TAB }));
      await user.type(screen.getByRole('textbox', { name: ENGLISH_NAME }), 'Study');
      await user.click(screen.getByRole('button', { name: REMOVE_ENGLISH }));

      expect(screen.queryByRole('textbox', { name: ENGLISH_NAME })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: ENGLISH_TAB })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(create).toHaveBeenCalled());
      expect(create.mock.calls[0][0].data.translations).toEqual([
         { language: 'cs', name: 'Studie' },
      ]);
   });

   it('should show both names of a saved tag and remove the saved English name', async () => {
      const user = renderDialog(BOTH);

      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toHaveValue(CS_NAME);
      await user.click(screen.getByRole('button', { name: ENGLISH_TAB }));
      expect(screen.getByRole('textbox', { name: ENGLISH_NAME })).toHaveValue(EN_NAME);

      await user.click(screen.getByRole('button', { name: REMOVE_ENGLISH }));
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0]).toEqual({
         id: 7,
         data: {
            version: 0,
            slug: SLUG,
            color: '#0130fe',
            translations: [{ language: 'cs', name: CS_NAME }],
         },
      });
   });

   it('should add an English name to a Czech-only tag on update', async () => {
      const user = renderDialog(CS_ONLY);

      await user.click(screen.getByRole('button', { name: ENGLISH_TAB }));
      await user.type(screen.getByRole('textbox', { name: ENGLISH_NAME }), EN_NAME);
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.translations).toEqual([
         { language: 'cs', name: CS_NAME },
         { language: 'en', name: EN_NAME },
      ]);
      expect(update.mock.calls[0][0].data.slug).toBe(SLUG);
   });

   it('should explain that one name serves every language until an English one is added', async () => {
      const user = renderDialog();
      const hint = 'The name is used in every language until you add an English one.';

      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toHaveAccessibleDescription(hint);

      await user.click(screen.getByRole('button', { name: ENGLISH_TAB }));
      expect(screen.getByRole('textbox', { name: ENGLISH_NAME })).toHaveAccessibleDescription(
         'The English name is used on the English site.',
      );
      await user.click(screen.getByRole('button', { name: 'Czech' }));
      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toHaveAccessibleDescription(
         'The Czech name is used on the Czech site.',
      );

      await user.click(screen.getByRole('button', { name: REMOVE_ENGLISH }));
      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toHaveAccessibleDescription(hint);
   });

   it('should lock the tabs of a role that may not change the tag', () => {
      signInAs(createUser(createRole(['tags.read'])));
      renderDialog(BOTH);

      expect(screen.getByRole('button', { name: REMOVE_ENGLISH })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
   });

   const renderLive = (tag: TagEntity) => {
      queryClient.setQueryData(tagKeys.detail(tag.id), tag);
      const LiveDialog = () => {
         const { data } = useQuery(api.tags.queries.detail(tag.id));
         return data ? <TagFormDialog open tag={data} onClose={vi.fn()} /> : null;
      };
      render(
         <TooltipProvider>
            <LiveDialog />
         </TooltipProvider>,
         { wrapper: QueryWrapper },
      );
      return userEvent.setup();
   };

   const staleVersionError = () =>
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
         status: 409,
         data: { message: 'changed', code: 'VERSION_CONFLICT', currentVersion: 1 },
      } as AxiosResponse);

   it('should send the version of the tag and tell a stale one with a dialog, keeping the input', async () => {
      update.mockRejectedValue(staleVersionError());
      const user = renderLive(CS_ONLY);

      await user.type(screen.getByRole('textbox', { name: CZECH_NAME }), ' 2');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(
         await screen.findByRole('alertdialog', { name: 'This record changed in the meantime' }),
      ).toBeInTheDocument();
      expect(update.mock.calls[0][0].data.version).toBe(0);
      expect(toast.error).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox', { name: CZECH_NAME, hidden: true })).toHaveValue(
         `${CS_NAME} 2`,
      );
   });

   it('should not overwrite the input when the tag changes in the cache, and save as a conflict', async () => {
      const user = renderLive(CS_ONLY);

      await user.type(screen.getByRole('textbox', { name: CZECH_NAME }), ' 2');
      act(() => {
         queryClient.setQueryData(tagKeys.detail(7), {
            ...CS_ONLY,
            version: 1,
            translations: [{ language: 'cs', name: 'Server name' }],
         });
      });

      expect(
         await screen.findByRole('button', { name: 'Load current version' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: CZECH_NAME })).toHaveValue(`${CS_NAME} 2`);

      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.version).toBe(0);
   });
});
