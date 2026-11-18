import type { EditLockEntity } from '@/api/generated';
import { CONTACT_LOCK_ID } from '@/utils/editLock';

export type EditLockTarget = { entity: EditLockEntity; id: number };

export const MAX_EDIT_LOCK_LOOKUPS = 5;

type Source = { entity: EditLockEntity; key: string; list?: true };

const of = (entity: EditLockEntity, key: string, names: string[]) =>
   names.map((name): [string, Source] => [name, { entity, key }]);
const ofList = (entity: EditLockEntity, key: string, names: string[]) =>
   names.map((name): [string, Source] => [name, { entity, key, list: true }]);

const SOURCES: Record<string, Source> = Object.fromEntries([
   ...of('projects', 'projectId', [
      'addProjectMedia',
      'addProjectTag',
      'assignProjectTags',
      'generateProjectTranslation',
      'moveProject',
      'removeProjectMedia',
      'removeProjectTag',
      'setProjectLinks',
      'setProjectThumbnail',
      'sortProjectMedia',
      'sortProjectTags',
      'upsertProjectTranslation',
   ]),
   ...of('projects', 'id', ['updateProject', 'updateProjectStatus']),
   ...ofList('projects', 'projects', [
      'addTagToProjects',
      'removeTagFromProjects',
      'updateProjectsStatus',
   ]),
   ...of('services', 'serviceId', [
      'addServiceProject',
      'assignServiceProjects',
      'generateServiceTranslation',
      'moveService',
      'removeServiceProject',
      'upsertServiceTranslation',
   ]),
   ...of('services', 'id', ['updateService', 'updateServiceStatus']),
   ...of('tags', 'tagId', ['moveTag']),
   ...of('tags', 'id', ['updateTag']),
   ...of('files', 'id', ['updateFile']),
   ...ofList('files', 'files', ['updateFiles']),
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
   typeof value === 'object' && value !== null;

export const getEditLockTargets = (toolName: string, input: unknown): EditLockTarget[] => {
   if (toolName === 'updateContact') return [{ entity: 'contact', id: CONTACT_LOCK_ID }];
   const source = SOURCES[toolName];
   if (!source || !isRecord(input)) return [];

   const value = input[source.key];
   const raw = source.list
      ? (Array.isArray(value) ? value : []).map((item) => (isRecord(item) ? item.id : undefined))
      : [value];
   return raw
      .filter((id): id is number => typeof id === 'number')
      .map((id) => ({ entity: source.entity, id }));
};
