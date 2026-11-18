import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { useEntityFormSync } from '../useEntityFormSync';

type Entity = { title: string; slug: string };

const toValues = (entity: Entity) => ({ title: entity.title, slug: entity.slug });

const renderSync = (entity: Entity) =>
   renderHook(
      ({ current }: { current: Entity }) => {
         const form = useForm<Entity>({ defaultValues: toValues(current) });
         useEntityFormSync(current, form, toValues);
         return { form, isDirty: form.formState.isDirty };
      },
      { initialProps: { current: entity } },
   );

describe('useEntityFormSync', () => {
   it('should take the refreshed data into the untouched fields and keep what the user typed', () => {
      const { result, rerender } = renderSync({ title: 'Web', slug: 'web' });

      act(() => result.current.form.setValue('title', 'Typed', { shouldDirty: true }));
      rerender({ current: { title: 'Web 2', slug: 'web-2' } });

      expect(result.current.form.getValues()).toEqual({ title: 'Typed', slug: 'web-2' });
      expect(result.current.isDirty).toBe(true);
   });

   it('should apply a refresh that came during a save once the save is over', async () => {
      const { result, rerender } = renderSync({ title: 'Web', slug: 'web' });
      let finishSave = () => {};
      const saved = new Promise<void>((resolve) => (finishSave = resolve));
      let submit: Promise<void> = Promise.resolve();
      await act(async () => {
         submit = result.current.form.handleSubmit(() => saved)();
      });

      rerender({ current: { title: 'Web 2', slug: 'web-2' } });
      expect(result.current.form.getValues('slug')).toBe('web');

      await act(async () => {
         finishSave();
         await submit;
      });
      expect(result.current.form.getValues('slug')).toBe('web-2');
   });
});
