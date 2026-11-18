import {
   type DiscoveredToolMeta,
   discoverToolMetadata,
} from '../../../src/ai/tools/__tests__/endpoint-inventory.fixture';
import { adminContext } from '../../../src/ai/tools/__tests__/tool-context.fixture';
import { AiToolRegistryService } from '../../../src/ai/tools/ai-tool-registry.service';
import type { ToolContext } from '../../../src/ai/tools/tool-auth';
import { CONTACT_LOCK_ID } from '../../../src/edit-lock/edit-lock.constants';
import { EditLockService } from '../../../src/edit-lock/edit-lock.service';
import { EditLockEntity } from '../../../src/edit-lock/enum/edit-lock-entity.enum';
import { getApp } from '../../setup/init';

const VERSIONED_TOOL_DIRS = /^(project|service|tag|file|contact)\//;

const CREATORS = ['createProject', 'createService', 'createTag'];

const project = (id: number) => ({ entity: EditLockEntity.projects, id });
const service = (id: number) => ({ entity: EditLockEntity.services, id });
const tag = (id: number) => ({ entity: EditLockEntity.tags, id });
const file = (id: number) => ({ entity: EditLockEntity.files, id });

const CASES: Record<string, { input: object; targets: object[] }> = {
   addProjectMedia: { input: { projectId: 11 }, targets: [project(11)] },
   addProjectTag: { input: { projectId: 11 }, targets: [project(11)] },
   addTagToProjects: {
      input: { projects: [{ id: 11 }, { id: 12 }] },
      targets: [project(11), project(12)],
   },
   assignProjectTags: { input: { projectId: 11 }, targets: [project(11)] },
   generateProjectTranslation: { input: { projectId: 11 }, targets: [project(11)] },
   moveProject: { input: { projectId: 11 }, targets: [project(11)] },
   removeProjectMedia: { input: { projectId: 11 }, targets: [project(11)] },
   removeProjectTag: { input: { projectId: 11 }, targets: [project(11)] },
   removeTagFromProjects: { input: { projects: [{ id: 11 }] }, targets: [project(11)] },
   setProjectLinks: { input: { projectId: 11 }, targets: [project(11)] },
   setProjectThumbnail: { input: { projectId: 11 }, targets: [project(11)] },
   sortProjectMedia: { input: { projectId: 11 }, targets: [project(11)] },
   sortProjectTags: { input: { projectId: 11 }, targets: [project(11)] },
   updateProject: { input: { id: 11 }, targets: [project(11)] },
   updateProjectStatus: { input: { id: 11 }, targets: [project(11)] },
   updateProjectsStatus: {
      input: { projects: [{ id: 11 }, { id: 12 }] },
      targets: [project(11), project(12)],
   },
   upsertProjectTranslation: { input: { projectId: 11 }, targets: [project(11)] },
   addServiceProject: { input: { serviceId: 21 }, targets: [service(21)] },
   assignServiceProjects: { input: { serviceId: 21 }, targets: [service(21)] },
   generateServiceTranslation: { input: { serviceId: 21 }, targets: [service(21)] },
   moveService: { input: { serviceId: 21 }, targets: [service(21)] },
   removeServiceProject: { input: { serviceId: 21 }, targets: [service(21)] },
   updateService: { input: { id: 21 }, targets: [service(21)] },
   updateServiceStatus: { input: { id: 21 }, targets: [service(21)] },
   upsertServiceTranslation: { input: { serviceId: 21 }, targets: [service(21)] },
   moveTag: { input: { tagId: 31 }, targets: [tag(31)] },
   updateTag: { input: { id: 31 }, targets: [tag(31)] },
   updateFile: { input: { id: 41 }, targets: [file(41)] },
   updateFiles: { input: { files: [{ id: 41 }, { id: 42 }] }, targets: [file(41), file(42)] },
   updateContact: { input: {}, targets: [{ entity: EditLockEntity.contact, id: CONTACT_LOCK_ID }] },
};

const WRITE_TOOLS = discoverToolMetadata().filter(
   ({ file: path, meta }) => VERSIONED_TOOL_DIRS.test(path) && meta.behavior === 'mutating',
);

describe('Edit lock of AURORA tools (e2e)', () => {
   const owner = (): ToolContext => ({
      ...adminContext(),
      user: { ...adminContext().user, id: 1 },
   });
   const other = 2;

   it('every mutating tool over these records names its target or creates one', () => {
      const names = WRITE_TOOLS.map(({ meta }) => meta.name);
      const withTarget = WRITE_TOOLS.filter(({ meta }) => meta.editTarget).map(
         ({ meta }) => meta.name,
      );

      expect(names.filter((name) => !withTarget.includes(name)).sort()).toEqual(CREATORS);
      expect(withTarget.sort()).toEqual(Object.keys(CASES).sort());
   });

   describe.each(
      WRITE_TOOLS.filter(({ meta }) => meta.editTarget).map(
         (tool): [string, DiscoveredToolMeta] => [tool.meta.name, tool],
      ),
   )('%s', (name, { meta }) => {
      it('names the records it changes', () => {
         expect(meta.editTarget?.(CASES[name].input as never)).toEqual(CASES[name].targets);
      });

      it('asks for approval while another user edits one of them, not for the own lock', async () => {
         const locks = getApp().get(EditLockService);
         const registry = getApp().get(AiToolRegistryService);
         const ctx = owner();
         const gate = registry.getToolSet(ctx)[name]?.needsApproval as (
            input: unknown,
            options: unknown,
         ) => Promise<boolean>;
         const ask = () => gate(CASES[name].input, { experimental_context: ctx });
         const targets = CASES[name].targets as { entity: EditLockEntity; id: number }[];
         const last = targets[targets.length - 1];
         const baseline = await ask();

         await locks.acquire(
            last.entity,
            last.id,
            { id: ctx.user.id, name: 'Me' },
            'tab-owner-1',
            false,
         );
         expect(await ask()).toBe(baseline);

         await locks.acquire(
            last.entity,
            last.id,
            { id: other, name: 'Jana' },
            'tab-other-1',
            true,
         );
         expect(await ask()).toBe(true);
      });
   });
});
