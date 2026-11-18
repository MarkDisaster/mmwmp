import type { QueryClient } from '@tanstack/react-query';

import { queryKeys as usersKeys } from '@/api/endpoints/users';
import { isRecord } from '@/features/ai-chat/utils/isRecord';

export type KnownUser = { id: number; email: string; firstName?: string; lastName?: string };

export type UserSummaryLine =
   | { key: 'chat.approval.userLabel'; params: { name: string; email: string; id: number } }
   | { key: 'chat.approval.userEmail'; params: { email: string; id: number } }
   | { key: 'chat.approval.userTarget'; params: { id: number } };

const USER_TOOLS = new Set(['deactivateUser']);

const isKnownUser = (value: unknown): value is KnownUser =>
   isRecord(value) && typeof value.id === 'number' && typeof value.email === 'string';

export const findCachedUser = (queryClient: QueryClient, id: number): KnownUser | undefined => {
   for (const [, data] of queryClient.getQueriesData<unknown>({ queryKey: usersKeys.all })) {
      if (isKnownUser(data) && data.id === id) return data;
      const list = isRecord(data) && Array.isArray(data.data) ? data.data : [];
      const user = list.find((item): item is KnownUser => isKnownUser(item) && item.id === id);
      if (user) return user;
   }
   return undefined;
};

export const summarizeUserInput = (
   toolName: string,
   input: unknown,
   findUser: (id: number) => KnownUser | undefined,
): UserSummaryLine | null => {
   if (!USER_TOOLS.has(toolName) || !isRecord(input) || typeof input.id !== 'number') return null;
   const { id } = input;
   const user = findUser(id);
   if (!user) return { key: 'chat.approval.userTarget', params: { id } };
   const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
   return name === ''
      ? { key: 'chat.approval.userEmail', params: { email: user.email, id } }
      : { key: 'chat.approval.userLabel', params: { name, email: user.email, id } };
};
