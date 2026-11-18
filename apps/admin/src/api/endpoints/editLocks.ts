import { mutationOptions, queryOptions } from '@tanstack/react-query';

import type { EditLockEntity } from '@/api/generated';
import {
   editLockControllerAcquire,
   editLockControllerFind,
   editLockControllerRelease,
} from '@/api/generated';
import type { ApiDefinitionObject, MutationKeysObject, QueryKeysObject } from '@/api/types';

const ROOT = 'edit-locks';

const queryKeys = {
   all: [ROOT] as const,
   detail: (entity: EditLockEntity, id: number) => [ROOT, entity, id] as const,
} satisfies QueryKeysObject;

const mutationKeys = {
   acquire: [ROOT, 'acquire'] as const,
   release: [ROOT, 'release'] as const,
} satisfies MutationKeysObject;

type LockTarget = { entity: EditLockEntity; id: number; sessionId: string };

export const editLocks = {
   queries: {
      detail: (entity: EditLockEntity, id: number) =>
         queryOptions({
            queryKey: queryKeys.detail(entity, id),
            queryFn: () => editLockControllerFind(entity, id).then((r) => r.data),
            staleTime: 0,
            retry: false,
         }),
   },
   mutations: {
      acquire: mutationOptions({
         mutationKey: mutationKeys.acquire,
         meta: { silent: true },
         mutationFn: ({ entity, id, sessionId, takeOver }: LockTarget & { takeOver?: boolean }) =>
            editLockControllerAcquire(entity, id, { sessionId, takeOver }).then((r) => r.data),
      }),
      release: mutationOptions({
         mutationKey: mutationKeys.release,
         meta: { silent: true },
         mutationFn: ({ entity, id, sessionId }: LockTarget) =>
            editLockControllerRelease(entity, id, { sessionId }).then((r) => r.data),
      }),
   },
} satisfies ApiDefinitionObject;
