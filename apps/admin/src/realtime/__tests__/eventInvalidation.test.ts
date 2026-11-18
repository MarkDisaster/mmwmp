import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { queryKeys as contactKeys } from '@/api/endpoints/contact';
import { queryKeys as filesKeys } from '@/api/endpoints/files';
import { queryKeys as projectsKeys } from '@/api/endpoints/projects';
import { queryKeys as servicesKeys } from '@/api/endpoints/services';
import { queryKeys as tagsKeys } from '@/api/endpoints/tags';
import type { AdminEventEntity } from '@/api/generated';
import { editLockEntityEnum } from '@/api/generated';
import { trashQueryKeys } from '@/api/trashKeys';
import { collectInvalidationKeys } from '@/features/ai-chat/utils/writeToolCacheInvalidation';

import { getAllEventInvalidationKeys, getEventInvalidationKeys } from '../eventInvalidation';

type Action = AdminEventEntity['action'];
const ACTIONS: Action[] = ['created', 'updated', 'deleted', 'restored', 'moved'];
const ENTITIES = Object.values(editLockEntityEnum);

describe('getEventInvalidationKeys', () => {
   it('refreshes a project and what shows it: the services and the tag counts', () => {
      expect(getEventInvalidationKeys({ entity: 'projects', action: 'updated' })).toEqual([
         projectsKeys.all,
         servicesKeys.all,
         tagsKeys.all,
      ]);
   });

   it('refreshes the projects when a tag or a file changed, they embed them', () => {
      expect(getEventInvalidationKeys({ entity: 'tags', action: 'moved' })).toEqual([
         tagsKeys.all,
         projectsKeys.all,
      ]);
      expect(getEventInvalidationKeys({ entity: 'files', action: 'updated' })).toEqual([
         filesKeys.all,
         projectsKeys.all,
      ]);
   });

   it('refreshes the trash too when a record leaves or returns', () => {
      expect(getEventInvalidationKeys({ entity: 'services', action: 'deleted' })).toEqual([
         servicesKeys.all,
         projectsKeys.all,
         trashQueryKeys.all,
      ]);
      expect(getEventInvalidationKeys({ entity: 'projects', action: 'restored' })).toContainEqual(
         trashQueryKeys.all,
      );
   });

   it('refreshes the contact detail', () => {
      expect(getEventInvalidationKeys({ entity: 'contact', action: 'updated' })).toEqual([
         contactKeys.detail,
      ]);
   });

   it.each(ENTITIES.flatMap((entity) => ACTIONS.map((action) => [entity, action] as const)))(
      'refreshes something for every entity and action: %s %s',
      (entity, action) => {
         expect(getEventInvalidationKeys({ entity, action }).length).toBeGreaterThan(0);
      },
   );

   it('stays inside the keys of the full refresh', () => {
      const all = getAllEventInvalidationKeys();
      for (const entity of ENTITIES) {
         for (const action of ACTIONS) {
            for (const key of getEventInvalidationKeys({ entity, action })) {
               expect(all).toContainEqual(key);
            }
         }
      }
   });
});

describe('the live events and the AURORA write tools', () => {
   const toolKeys = (name: string) =>
      collectInvalidationKeys({
         id: 'm',
         role: 'assistant',
         parts: [
            {
               type: `tool-${name}`,
               toolCallId: 'c',
               state: 'output-available',
               input: {},
               output: {},
            },
         ],
      } as unknown as UIMessage);

   it.each([
      ['createTag', 'tags', 'created'],
      ['updateTag', 'tags', 'updated'],
      ['moveTag', 'tags', 'moved'],
      ['deleteTag', 'tags', 'deleted'],
      ['restoreTag', 'tags', 'restored'],
      ['createProject', 'projects', 'created'],
      ['updateProject', 'projects', 'updated'],
      ['addTagToProjects', 'projects', 'updated'],
      ['removeTagFromProjects', 'projects', 'updated'],
      ['moveProject', 'projects', 'moved'],
      ['deleteProject', 'projects', 'deleted'],
      ['restoreProject', 'projects', 'restored'],
      ['createService', 'services', 'created'],
      ['updateService', 'services', 'updated'],
      ['assignServiceProjects', 'services', 'updated'],
      ['addServiceProject', 'services', 'updated'],
      ['removeServiceProject', 'services', 'updated'],
      ['moveService', 'services', 'moved'],
      ['deleteService', 'services', 'deleted'],
      ['restoreService', 'services', 'restored'],
      ['updateContact', 'contact', 'updated'],
      ['updateFile', 'files', 'updated'],
      ['deleteFile', 'files', 'deleted'],
      ['restoreFile', 'files', 'restored'],
   ] as const)('%s and a %s event "%s" refresh the same caches', (tool, entity, action) => {
      const byTool = toolKeys(tool).map((key) => JSON.stringify(key));
      const byEvent = getEventInvalidationKeys({ entity, action }).map((key) =>
         JSON.stringify(key),
      );

      expect(byTool.sort()).toEqual(byEvent.sort());
   });
});
