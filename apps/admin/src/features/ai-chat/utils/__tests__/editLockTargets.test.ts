import { describe, expect, it } from 'vitest';

import { getEditLockTargets } from '../editLockTargets';

describe('getEditLockTargets', () => {
   it.each([
      ['updateProject', { id: 4 }, [{ entity: 'projects', id: 4 }]],
      ['addProjectTag', { projectId: 4, tagId: 9 }, [{ entity: 'projects', id: 4 }]],
      [
         'updateProjectsStatus',
         { projects: [{ id: 4 }, { id: 5 }] },
         [
            { entity: 'projects', id: 4 },
            { entity: 'projects', id: 5 },
         ],
      ],
      ['addServiceProject', { serviceId: 2, projectId: 4 }, [{ entity: 'services', id: 2 }]],
      ['moveTag', { tagId: 8, targetTagId: 9 }, [{ entity: 'tags', id: 8 }]],
      [
         'updateFiles',
         { files: [{ id: 1 }, { id: 2 }] },
         [
            { entity: 'files', id: 1 },
            { entity: 'files', id: 2 },
         ],
      ],
      ['updateContact', {}, [{ entity: 'contact', id: 0 }]],
   ])('should read the records of %s from its input', (tool, input, expected) => {
      expect(getEditLockTargets(tool, input)).toEqual(expected);
   });

   it.each([
      ['an unknown tool', 'listProjects', { id: 1 }],
      ['a creating tool', 'createProject', { slug: 'a' }],
      ['an input without the id', 'updateProject', {}],
      ['an input that is not an object', 'updateProject', 'x'],
      ['a list that is not an array', 'updateFiles', { files: 'x' }],
   ])('should name no record for %s', (_label, tool, input) => {
      expect(getEditLockTargets(tool, input)).toEqual([]);
   });
});
