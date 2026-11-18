import type { QueryKey } from '@tanstack/react-query';

import { queryKeys as contactKeys } from '@/api/endpoints/contact';
import { queryKeys as filesKeys } from '@/api/endpoints/files';
import { queryKeys as projectsKeys } from '@/api/endpoints/projects';
import { queryKeys as servicesKeys } from '@/api/endpoints/services';
import { queryKeys as tagsKeys } from '@/api/endpoints/tags';
import type { AdminEventEntity } from '@/api/generated';
import { trashQueryKeys } from '@/api/trashKeys';

export type InvalidatedEntity = AdminEventEntity['entity'];

const ENTITY_KEYS: Record<InvalidatedEntity, readonly QueryKey[]> = {
   projects: [projectsKeys.all, servicesKeys.all, tagsKeys.all],
   services: [servicesKeys.all, projectsKeys.all],
   tags: [tagsKeys.all, projectsKeys.all],
   files: [filesKeys.all, projectsKeys.all],
   contact: [contactKeys.detail],
};

export const getEntityInvalidationKeys = (
   entities: readonly InvalidatedEntity[],
   { trash = false }: { trash?: boolean } = {},
): QueryKey[] => {
   const keys = new Map<string, QueryKey>();
   for (const key of [
      ...entities.flatMap((entity) => ENTITY_KEYS[entity]),
      ...(trash ? [trashQueryKeys.all] : []),
   ]) {
      keys.set(JSON.stringify(key), key);
   }
   return [...keys.values()];
};
