import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PUBLISHED_CONTENT_FORBIDDEN_MESSAGE } from '@/utils/httpError';

import { useAggregateSave } from '../useAggregateSave';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

type Entity = { id: number; slug: string; version: number };
type Values = { slug: string };

const MESSAGES = {
   failure: {
      slugTaken: 'projects.validation.slugTaken',
      conflict: 'projects.toast.saveConflict',
      invalid: 'projects.toast.saveInvalid',
      forbidden: 'projects.toast.saveForbidden',
      missing: 'projects.toast.saveMissing',
      failed: 'projects.toast.error',
   },
   created: 'projects.toast.created',
   saved: 'projects.toast.saved',
   published: 'projects.toast.published',
};

const httpError = (status: number, data?: unknown) =>
   new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
      status,
      data,
   } as AxiosResponse);

type Sent = Values & { version?: number };

const renderSave = (
   entity: Entity | undefined,
   request: (data: Sent) => Promise<Entity>,
   fetchCurrent: (id: number) => Promise<Entity> = async (id) => ({
      id,
      slug: 'fresh',
      version: 9,
   }),
) => {
   const queryClient = new QueryClient();
   const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
   );
   const openCreated = vi.fn(async () => {});
   const toDto = vi.fn((values: Values, options: { status?: 'published' }) => ({
      ...values,
      ...options,
   }));
   const { result, rerender } = renderHook(
      ({ current }: { current: Entity | undefined }) => {
         const form = useForm<Values>({ defaultValues: { slug: entity?.slug ?? '' } });
         const aggregate = useAggregateSave<Entity, Values, Sent>(current, form, {
            saveNew: { mutationFn: ({ data }) => request(data) },
            saveExisting: { mutationFn: ({ data }) => request(data) },
            toDto,
            toValues: (saved) => ({ slug: saved.slug }),
            openCreated,
            fetchCurrent,
            messages: MESSAGES,
         });
         const { isDirty, errors } = form.formState;
         return { form, aggregate, save: aggregate.save, isDirty, slugError: errors.slug?.message };
      },
      { wrapper, initialProps: { current: entity } },
   );
   return {
      result,
      openCreated,
      toDto,
      rerender: (current: Entity | undefined) => rerender({ current }),
   };
};

describe('useAggregateSave', () => {
   beforeEach(() => {
      vi.mocked(toast.error).mockClear();
      vi.mocked(toast.success).mockClear();
   });

   it('should open a created record', async () => {
      const { result, openCreated } = renderSave(undefined, async () => ({
         id: 7,
         slug: 'web',
         version: 1,
      }));

      await act(() => result.current.save({ slug: 'web' }));

      expect(openCreated).toHaveBeenCalledWith({ id: 7, slug: 'web', version: 1 });
      expect(toast.success).toHaveBeenCalledWith('Project created');
   });

   it('should reset a saved record to the answer of the API', async () => {
      const { result, openCreated } = renderSave({ id: 7, slug: 'web', version: 1 }, async () => ({
         id: 7,
         slug: 'stored-web',
         version: 2,
      }));

      act(() => result.current.form.setValue('slug', 'typed', { shouldDirty: true }));
      await act(() => result.current.save({ slug: 'typed' }));

      expect(result.current.form.getValues('slug')).toBe('stored-web');
      expect(result.current.isDirty).toBe(false);
      expect(openCreated).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith('Project saved');
   });

   it('should publish in the same request only when asked to', async () => {
      const { result, toDto } = renderSave({ id: 7, slug: 'web', version: 1 }, async () => ({
         id: 7,
         slug: 'web',
         version: 2,
      }));

      await act(() => result.current.save({ slug: 'web' }, { publish: true }));
      await act(() => result.current.save({ slug: 'web' }));

      expect(toDto).toHaveBeenNthCalledWith(1, { slug: 'web' }, { status: 'published' });
      expect(toDto).toHaveBeenNthCalledWith(2, { slug: 'web' }, { status: undefined });
      expect(toast.success).toHaveBeenNthCalledWith(1, 'Project published');
   });

   it('should show a taken slug at the slug input and keep the input', async () => {
      const { result, openCreated } = renderSave(undefined, () =>
         Promise.reject(httpError(409, { message: 'taken', code: 'SLUG_TAKEN' })),
      );

      act(() => result.current.form.setValue('slug', 'web', { shouldDirty: true }));
      await act(() => result.current.save({ slug: 'web' }));

      const message = 'A project with this slug already exists';
      expect(result.current.slugError).toBe(message);
      expect(result.current.form.getValues('slug')).toBe('web');
      expect(toast.error).toHaveBeenCalledWith(message);
      expect(openCreated).not.toHaveBeenCalled();
   });

   it('should ask to save again after a conflict without blaming the slug', async () => {
      const { result } = renderSave({ id: 7, slug: 'web', version: 1 }, () =>
         Promise.reject(httpError(409, { message: 'busy', code: 'BUSY' })),
      );

      act(() => result.current.form.setValue('slug', 'typed', { shouldDirty: true }));
      await act(() => result.current.save({ slug: 'typed' }));

      expect(result.current.slugError).toBeUndefined();
      expect(result.current.form.getValues('slug')).toBe('typed');
      expect(toast.error).toHaveBeenCalledWith(
         'The project could not be saved: the same data was being changed at the same time. Nothing was stored, try saving again.',
      );
   });

   it('should report another failure with a toast only', async () => {
      const { result } = renderSave({ id: 7, slug: 'web', version: 1 }, () =>
         Promise.reject(httpError(400)),
      );

      await act(() => result.current.save({ slug: 'web' }));

      expect(result.current.slugError).toBeUndefined();
      expect(toast.error).toHaveBeenCalledWith(
         'The project could not be saved: the server rejected some of the data.',
      );
   });

   it('should say why a published record without the publish permission was not saved', async () => {
      const { result } = renderSave({ id: 7, slug: 'web', version: 1 }, () =>
         Promise.reject(httpError(403, { message: PUBLISHED_CONTENT_FORBIDDEN_MESSAGE })),
      );

      await act(() => result.current.save({ slug: 'web' }));

      expect(toast.error).toHaveBeenCalledWith(
         'Only a role with the publish permission can change published content.',
      );
   });

   it('should send the version the form was filled from', async () => {
      const request = vi.fn(async (data: Sent) => ({ id: 7, slug: data.slug, version: 4 }));
      const { result } = renderSave({ id: 7, slug: 'web', version: 3 }, request);

      await act(() => result.current.save({ slug: 'web' }));

      expect(request).toHaveBeenCalledWith(expect.objectContaining({ version: 3 }));
   });

   it('should send the version of the previous save the next time', async () => {
      const entity = { id: 7, slug: 'web', version: 3 };
      const request = vi.fn(async (data: Sent) => ({ ...entity, slug: data.slug, version: 4 }));
      const { result } = renderSave(entity, request);

      await act(() => result.current.save({ slug: 'one' }));
      await act(() => result.current.save({ slug: 'two' }));

      expect(request).toHaveBeenNthCalledWith(2, expect.objectContaining({ version: 4 }));
   });

   it('should show the dialog, not a toast, when the version is stale', async () => {
      const { result, openCreated } = renderSave({ id: 7, slug: 'web', version: 1 }, () =>
         Promise.reject(
            httpError(409, { message: 'changed', code: 'VERSION_CONFLICT', currentVersion: 2 }),
         ),
      );

      act(() => result.current.form.setValue('slug', 'typed', { shouldDirty: true }));
      await act(() => result.current.save({ slug: 'typed' }));

      expect(result.current.aggregate.conflictDialogProps.open).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
      expect(result.current.slugError).toBeUndefined();
      expect(result.current.form.getValues('slug')).toBe('typed');
      expect(openCreated).not.toHaveBeenCalled();
   });

   it('should load the current record into the form from the dialog', async () => {
      const { result } = renderSave({ id: 7, slug: 'web', version: 1 }, () =>
         Promise.reject(httpError(409, { message: 'changed', code: 'VERSION_CONFLICT' })),
      );

      act(() => result.current.form.setValue('slug', 'typed', { shouldDirty: true }));
      await act(() => result.current.save({ slug: 'typed' }));
      await act(() => result.current.aggregate.conflictDialogProps.onReload());

      expect(result.current.form.getValues('slug')).toBe('fresh');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.aggregate.conflictDialogProps.open).toBe(false);
   });

   it('should save with the version of the record loaded from the dialog', async () => {
      const request = vi
         .fn<(data: Sent) => Promise<Entity>>()
         .mockRejectedValueOnce(httpError(409, { message: 'changed', code: 'VERSION_CONFLICT' }))
         .mockResolvedValue({ id: 7, slug: 'fresh', version: 10 });
      const { result } = renderSave({ id: 7, slug: 'web', version: 1 }, request);

      await act(() => result.current.save({ slug: 'typed' }));
      await act(() => result.current.aggregate.conflictDialogProps.onReload());
      await act(() => result.current.save({ slug: 'fresh' }));

      expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ version: 9 }));
   });

   it('should say why the current version could not be loaded and keep the form', async () => {
      const { result } = renderSave(
         { id: 7, slug: 'web', version: 1 },
         () => Promise.reject(httpError(409, { message: 'changed', code: 'VERSION_CONFLICT' })),
         () => Promise.reject(new Error('Network Error')),
      );

      act(() => result.current.form.setValue('slug', 'typed', { shouldDirty: true }));
      await act(() => result.current.save({ slug: 'typed' }));
      await act(() => result.current.aggregate.conflictDialogProps.onReload());

      expect(toast.error).toHaveBeenCalledWith(
         'The current version could not be loaded, try again.',
      );
      expect(result.current.aggregate.conflictDialogProps.open).toBe(true);
      expect(result.current.aggregate.conflictDialogProps.isReloading).toBe(false);
      expect(result.current.form.getValues('slug')).toBe('typed');
   });

   it('should close the dialog with a message when the record was deleted meanwhile', async () => {
      const { result } = renderSave(
         { id: 7, slug: 'web', version: 1 },
         () => Promise.reject(httpError(409, { message: 'changed', code: 'VERSION_CONFLICT' })),
         () => Promise.reject(httpError(404)),
      );

      await act(() => result.current.save({ slug: 'typed' }));
      await act(() => result.current.aggregate.conflictDialogProps.onReload());

      expect(toast.error).toHaveBeenCalledWith(
         'Someone deleted this record in the meantime, the current version cannot be loaded.',
      );
      expect(result.current.aggregate.conflictDialogProps.open).toBe(false);
   });

   it('should keep the version of the form when the record changes under unsaved input', () => {
      const request = vi.fn(async (data: Sent) => ({ id: 7, slug: data.slug, version: 5 }));
      const { result, rerender } = renderSave({ id: 7, slug: 'web', version: 1 }, request);

      act(() => result.current.form.setValue('slug', 'typed', { shouldDirty: true }));
      rerender({ id: 7, slug: 'web', version: 2 });

      expect(result.current.aggregate.hasNewerVersion).toBe(true);
   });
});
