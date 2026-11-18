import { useEffect, useEffectEvent, useRef } from 'react';
import type { FieldValues, KeepStateOptions, UseFormReturn } from 'react-hook-form';

const KEEP_USER_INPUT = {
   keepDirtyValues: true,
   keepDirty: true,
   keepErrors: true,
   keepTouched: true,
   keepIsSubmitted: true,
   keepSubmitCount: true,
} as const satisfies KeepStateOptions;

export const useEntityFormSync = <TEntity, TValues extends FieldValues>(
   entity: TEntity | undefined,
   form: Pick<UseFormReturn<TValues>, 'reset' | 'formState'>,
   toValues: (entity: TEntity) => TValues,
) => {
   const { reset } = form;
   const { isSubmitting } = form.formState;
   const appliedEntity = useRef(entity);
   const applyEntity = useEffectEvent((next: TEntity) => reset(toValues(next), KEEP_USER_INPUT));

   useEffect(() => {
      if (entity === undefined || entity === appliedEntity.current || isSubmitting) return;
      appliedEntity.current = entity;
      applyEntity(entity);
   }, [entity, isSubmitting]);
};
