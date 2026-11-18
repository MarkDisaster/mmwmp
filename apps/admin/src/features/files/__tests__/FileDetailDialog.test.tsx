import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, type AxiosResponse } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FileEntity } from '@/api/generated';
import { TooltipProvider } from '@/components/ui/tooltip';

import { FileDetailDialog } from '../components/FileDetailDialog';
import { MAX_ALT_TEXT_LENGTH } from '../validation/fileEditSchema';

const ALT_LABEL = 'Image description (alt)';
const PDF = 'application/pdf';
const update = vi.hoisted(() => vi.fn());

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@/api')>();
   const { mutations: lockMutations } = actual.api.editLocks;
   return {
      ...actual,
      api: {
         ...actual.api,
         files: {
            ...actual.api.files,
            mutations: { ...actual.api.files.mutations, update: { mutationFn: update } },
         },
         editLocks: {
            ...actual.api.editLocks,
            mutations: {
               acquire: {
                  ...lockMutations.acquire,
                  mutationFn: vi.fn().mockResolvedValue({ heldBy: null, mine: false }),
               },
               release: {
                  ...lockMutations.release,
                  mutationFn: vi.fn().mockResolvedValue(undefined),
               },
            },
         },
      },
   };
});

const file = (overrides: Partial<FileEntity> = {}) =>
   ({
      id: 5,
      filename: 'a.webp',
      originalName: 'a.png',
      displayName: null,
      altText: null,
      mimeType: 'image/png',
      size: 1000,
      width: 10,
      height: 10,
      language: null,
      version: 3,
      publicUrl: 'https://cdn.test/a.png',
      variants: [],
      ...overrides,
   }) as unknown as FileEntity;

const dialog = (entity: FileEntity, onOpenChange = vi.fn()) => (
   <QueryClientProvider client={queryClient}>
      <TooltipProvider>
         <FileDetailDialog open onOpenChange={onOpenChange} file={entity} initialMode="edit" />
      </TooltipProvider>
   </QueryClientProvider>
);

let queryClient = new QueryClient();

const renderDialog = (entity: FileEntity, onOpenChange = vi.fn()) => {
   queryClient = new QueryClient();
   return render(dialog(entity, onOpenChange));
};

describe('FileDetailDialog alt text', () => {
   beforeEach(() => {
      update.mockReset();
      update.mockImplementation(async ({ data }) => ({ ...file(), ...data }));
   });

   it('should show the alt field for an image, limited as in the API', () => {
      renderDialog(file());
      expect(screen.getByLabelText(ALT_LABEL)).toHaveAttribute(
         'maxlength',
         String(MAX_ALT_TEXT_LENGTH),
      );
   });

   it('should hide the alt field for a file that is not an image', () => {
      renderDialog(file({ mimeType: PDF }));
      expect(screen.queryByLabelText(ALT_LABEL)).not.toBeInTheDocument();
   });

   it('should send the trimmed alt text', async () => {
      const user = userEvent.setup();
      renderDialog(file());
      await user.type(screen.getByLabelText(ALT_LABEL), '  A red car  ');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.altText).toBe('A red car');
   });

   it('should send null when the alt text is cleared', async () => {
      const user = userEvent.setup();
      renderDialog(file({ altText: 'Old' }));
      await user.clear(screen.getByLabelText(ALT_LABEL));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.altText).toBeNull();
   });

   it('should not send an alt text for a file that is not an image', async () => {
      const user = userEvent.setup();
      renderDialog(file({ mimeType: PDF }));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data).not.toHaveProperty('altText');
   });

   it('should send null for a name of spaces only', async () => {
      const user = userEvent.setup();
      renderDialog(file({ displayName: 'Logo' }));
      await user.clear(screen.getByLabelText('File name'));
      await user.type(screen.getByLabelText('File name'), '   ');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.displayName).toBeNull();
   });

   it('should save on Enter in the name field', async () => {
      const user = userEvent.setup();
      renderDialog(file());
      await user.type(screen.getByLabelText('File name'), ' 2{Enter}');
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.displayName).toBe('a.png 2');
   });

   it('should close without saving when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDialog(file(), onOpenChange);
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
      expect(update).not.toHaveBeenCalled();
   });

   it('should save a file that is not an image despite a stored alt text over the limit', async () => {
      const user = userEvent.setup();
      renderDialog(file({ mimeType: PDF, altText: 'a'.repeat(MAX_ALT_TEXT_LENGTH + 1) }));
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
   });

   it('should keep the typed name and take the rest from a refetched file', async () => {
      const user = userEvent.setup();
      const { rerender } = renderDialog(file());
      await user.type(screen.getByLabelText('File name'), ' 2');
      rerender(dialog(file({ displayName: 'Renamed elsewhere', language: 'en' })));
      await waitFor(() => expect(screen.getByLabelText('Language')).toHaveTextContent('English'));
      expect(screen.getByLabelText('File name')).toHaveValue('a.png 2');
   });

   it('should label the language select and send the stored language', async () => {
      const user = userEvent.setup();
      renderDialog(file({ language: 'en' }));
      expect(screen.getByLabelText('Language')).toHaveTextContent('English');
      await user.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(update).toHaveBeenCalled());
      expect(update.mock.calls[0][0].data.language).toBe('en');
   });

   it('should send the version of the file and tell a stale one with a dialog', async () => {
      update.mockRejectedValue(
         new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
            status: 409,
            data: { message: 'changed', code: 'VERSION_CONFLICT', currentVersion: 4 },
         } as AxiosResponse),
      );
      const user = userEvent.setup();
      renderDialog(file());

      await user.type(screen.getByLabelText(ALT_LABEL), 'A red car');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(
         await screen.findByRole('alertdialog', {
            name: 'This record changed in the meantime',
         }),
      ).toBeInTheDocument();
      expect(update.mock.calls[0][0].data.version).toBe(3);
   });
});
