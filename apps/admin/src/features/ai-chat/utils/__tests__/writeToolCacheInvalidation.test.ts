import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { queryKeys as contactKeys } from '@/api/endpoints/contact';
import { queryKeys as projectsKeys } from '@/api/endpoints/projects';
import { queryKeys as servicesKeys } from '@/api/endpoints/services';
import { queryKeys as tagsKeys } from '@/api/endpoints/tags';
import { trashQueryKeys } from '@/api/trashKeys';
import { getEntityInvalidationKeys } from '@/utils/entityInvalidation';

import { collectInvalidationKeys, collectNewInvalidationKeys } from '../writeToolCacheInvalidation';

const message = (parts: unknown[]) =>
   ({ id: 'm1', role: 'assistant', parts }) as unknown as UIMessage;

const DONE = 'output-available';

const toolPart = (name: string, state: string) => ({
   type: `tool-${name}`,
   toolCallId: `call-${name}`,
   state,
   input: {},
   output: {},
});

describe('collectInvalidationKeys', () => {
   it('should collect the keys of write tools that finished', () => {
      expect(
         collectInvalidationKeys(
            message([toolPart('createTag', DONE), toolPart('updateContact', DONE)]),
         ),
      ).toEqual([tagsKeys.all, projectsKeys.all, contactKeys.detail]);
   });

   it('should deduplicate keys shared by several tools', () => {
      expect(
         collectInvalidationKeys(
            message([
               toolPart('deleteTag', DONE),
               toolPart('updateProject', DONE),
               toolPart('createTag', DONE),
            ]),
         ),
      ).toEqual([tagsKeys.all, projectsKeys.all, trashQueryKeys.all, servicesKeys.all]);
   });

   it('should refresh the projects too when the names of a tag change', () => {
      expect(collectInvalidationKeys(message([toolPart('updateTag', DONE)]))).toEqual([
         tagsKeys.all,
         projectsKeys.all,
      ]);
   });

   it('should match a dynamic tool part by its tool name', () => {
      expect(
         collectInvalidationKeys(
            message([
               {
                  type: 'dynamic-tool',
                  toolName: 'createTag',
                  toolCallId: 'call-1',
                  state: DONE,
                  input: {},
                  output: {},
               },
            ]),
         ),
      ).toEqual([tagsKeys.all, projectsKeys.all]);
   });

   it('should skip tool calls that did not succeed', () => {
      expect(
         collectInvalidationKeys(
            message([
               toolPart('createTag', 'input-available'),
               toolPart('deleteTag', 'output-error'),
               toolPart('deleteProject', 'approval-requested'),
               toolPart('deleteUser', 'output-denied'),
            ]),
         ),
      ).toEqual([]);
   });

   it('should skip read tools, client tools and non-tool parts', () => {
      expect(
         collectInvalidationKeys(
            message([
               { type: 'text', text: 'Hotovo.' },
               { type: 'step-start' },
               toolPart('listTags', DONE),
               toolPart('navigateTo', DONE),
            ]),
         ),
      ).toEqual([]);
   });
});

describe('collectNewInvalidationKeys', () => {
   it('should report a finished write tool before the turn ends, and only once', () => {
      const seen = new Set<string>();
      const running = message([toolPart('updateProject', 'input-available')]);
      const done = message([toolPart('updateProject', DONE)]);

      expect(collectNewInvalidationKeys([running], seen)).toEqual([]);
      expect(collectNewInvalidationKeys([done], seen)).toEqual(
         getEntityInvalidationKeys(['projects']),
      );
      expect(collectNewInvalidationKeys([done], seen)).toEqual([]);
   });

   it('should report the tools of every message', () => {
      const seen = new Set<string>();

      expect(
         collectNewInvalidationKeys(
            [message([toolPart('createTag', DONE)]), message([toolPart('updateContact', DONE)])],
            seen,
         ),
      ).toEqual([tagsKeys.all, projectsKeys.all, contactKeys.detail]);
   });
});
