import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/api';
import type { EditLockEntity } from '@/api/generated';
import { getAuthSession } from '@/features/auth/auth-query';
import { useAuth } from '@/hooks/useAuth';
import { API_URL } from '@/utils/axios';

const HEARTBEAT_MS = 20_000;

let tabSession: { userId: number; id: string } | null = null;

const getSessionId = (userId: number): string => {
   if (tabSession?.userId !== userId) tabSession = { userId, id: crypto.randomUUID() };
   return tabSession.id;
};

type LockState = { holder: { userId: number; name: string; since: string } | null; mine: boolean };

const releaseOnPageHide = (entity: EditLockEntity, id: number, sessionId: string) => {
   const token = getAuthSession()?.accessToken;
   if (!token) return;
   fetch(`${API_URL}/edit-locks/${entity}/${id}`, {
      method: 'DELETE',
      keepalive: true,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId }),
   }).catch(() => undefined);
};

export const useRecordLock = (entity: EditLockEntity, id: number) => {
   const { user } = useAuth();
   const sessionId = getSessionId(user?.id ?? 0);
   const heartbeat = useMutation(api.editLocks.mutations.acquire);
   const takeOverRequest = useMutation(api.editLocks.mutations.acquire);
   const release = useMutation(api.editLocks.mutations.release);
   const [state, setState] = useState<(LockState & { wasMine: boolean }) | null>(null);
   const sent = useRef(0);
   const applied = useRef(0);

   const send = (request: typeof heartbeat, takeOver: boolean) => {
      sent.current += 1;
      const sequence = sent.current;
      const settle = (next: (previous: typeof state) => typeof state) => {
         if (sequence < applied.current) return;
         applied.current = sequence;
         setState(next);
      };
      request.mutateAsync({ entity, id, sessionId, takeOver }).then(
         (lock) =>
            settle((previous) => ({
               holder: lock.heldBy,
               mine: lock.mine,
               wasMine: lock.mine || (!!lock.heldBy && !!previous?.wasMine),
            })),
         () => settle(() => null),
      );
   };

   useEffect(() => {
      send(heartbeat, false);
      const timer = setInterval(() => send(heartbeat, false), HEARTBEAT_MS);
      const onVisible = () => {
         if (document.visibilityState === 'visible') send(heartbeat, false);
      };
      const onPageHide = () => releaseOnPageHide(entity, id, sessionId);
      document.addEventListener('visibilitychange', onVisible);
      window.addEventListener('pagehide', onPageHide);
      return () => {
         clearInterval(timer);
         document.removeEventListener('visibilitychange', onVisible);
         window.removeEventListener('pagehide', onPageHide);
         release.mutate({ entity, id, sessionId });
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [entity, id, sessionId]);

   const foreign = state?.holder && !state.mine && state.holder.userId !== user?.id;

   return {
      heldBy: foreign ? state.holder : null,
      mine: state?.mine ?? false,
      takenOver: !!foreign && state.wasMine,
      takeOver: () => send(takeOverRequest, true),
   };
};
