import type { QueryKey } from '@tanstack/react-query';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';

import { queryKeys as rolesKeys } from '@/api/endpoints/roles';
import { queryKeys as runnerScoresKeys } from '@/api/endpoints/runnerScores';
import { queryKeys as usersKeys } from '@/api/endpoints/users';
import { getEntityInvalidationKeys } from '@/utils/entityInvalidation';

const WRITE_TOOL_INVALIDATIONS: Record<string, readonly QueryKey[]> = {
   createTag: getEntityInvalidationKeys(['tags']),
   updateTag: getEntityInvalidationKeys(['tags']),
   deleteTag: getEntityInvalidationKeys(['tags'], { trash: true }),
   restoreTag: getEntityInvalidationKeys(['tags'], { trash: true }),
   moveTag: getEntityInvalidationKeys(['tags']),
   createProject: getEntityInvalidationKeys(['projects']),
   sortProjectTags: getEntityInvalidationKeys(['projects']),
   generateProjectTranslation: [],
   updateProjectStatus: getEntityInvalidationKeys(['projects']),
   updateProject: getEntityInvalidationKeys(['projects']),
   deleteProject: getEntityInvalidationKeys(['projects'], { trash: true }),
   restoreProject: getEntityInvalidationKeys(['projects'], { trash: true }),
   assignProjectTags: getEntityInvalidationKeys(['projects']),
   addProjectTag: getEntityInvalidationKeys(['projects']),
   removeProjectTag: getEntityInvalidationKeys(['projects']),
   addProjectMedia: getEntityInvalidationKeys(['projects']),
   removeProjectMedia: getEntityInvalidationKeys(['projects']),
   sortProjectMedia: getEntityInvalidationKeys(['projects']),
   setProjectThumbnail: getEntityInvalidationKeys(['projects']),
   setProjectLinks: getEntityInvalidationKeys(['projects']),
   upsertProjectTranslation: getEntityInvalidationKeys(['projects']),
   deleteProjectTranslation: getEntityInvalidationKeys(['projects']),
   createService: getEntityInvalidationKeys(['services']),
   generateServiceTranslation: [],
   updateServiceStatus: getEntityInvalidationKeys(['services']),
   updateService: getEntityInvalidationKeys(['services']),
   deleteService: getEntityInvalidationKeys(['services'], { trash: true }),
   restoreService: getEntityInvalidationKeys(['services'], { trash: true }),
   assignServiceProjects: getEntityInvalidationKeys(['services']),
   addServiceProject: getEntityInvalidationKeys(['services']),
   removeServiceProject: getEntityInvalidationKeys(['services']),
   moveService: getEntityInvalidationKeys(['services']),
   moveProject: getEntityInvalidationKeys(['projects']),
   upsertServiceTranslation: getEntityInvalidationKeys(['services']),
   deleteServiceTranslation: getEntityInvalidationKeys(['services']),
   updateContact: getEntityInvalidationKeys(['contact']),
   updateMyName: [usersKeys.all],
   setRunnerScoreVisibility: [runnerScoresKeys.all],
   deleteRunnerScore: [runnerScoresKeys.all],
   deleteSlugRedirect: [],
   revalidateWebsite: [],
   inviteUser: [usersKeys.all],
   resendUserInvitation: [usersKeys.all],
   deactivateUser: [usersKeys.all],
   reactivateUser: [usersKeys.all],
   updateUser: [usersKeys.all],
   deleteUser: [usersKeys.all],
   createRole: [rolesKeys.all],
   updateRole: [rolesKeys.all, usersKeys.all],
   deleteRole: [rolesKeys.all],
   setRolePermissions: [rolesKeys.all, usersKeys.all],
   grantRolePermission: [rolesKeys.all, usersKeys.all],
   revokeRolePermission: [rolesKeys.all, usersKeys.all],
   updateFile: getEntityInvalidationKeys(['files']),
   updateFiles: getEntityInvalidationKeys(['files']),
   deleteFiles: getEntityInvalidationKeys(['files'], { trash: true }),
   updateProjectsStatus: getEntityInvalidationKeys(['projects']),
   addTagToProjects: getEntityInvalidationKeys(['projects']),
   removeTagFromProjects: getEntityInvalidationKeys(['projects']),
   deleteFile: getEntityInvalidationKeys(['files'], { trash: true }),
   restoreFile: getEntityInvalidationKeys(['files'], { trash: true }),
   purgeTrash: getEntityInvalidationKeys(['files'], { trash: true }),
};

const collectKeys = (
   messages: readonly UIMessage[],
   isWanted: (toolCallId: string) => boolean,
): QueryKey[] => {
   const keys = new Set<QueryKey>();

   for (const message of messages) {
      for (const part of message.parts) {
         if (!isToolUIPart(part) || part.state !== 'output-available') continue;
         if (!isWanted(part.toolCallId)) continue;

         for (const key of WRITE_TOOL_INVALIDATIONS[getToolName(part)] ?? []) keys.add(key);
      }
   }

   return Array.from(keys);
};

export const collectInvalidationKeys = (message: UIMessage): QueryKey[] =>
   collectKeys([message], () => true);

export const collectNewInvalidationKeys = (
   messages: readonly UIMessage[],
   seen: Set<string>,
): QueryKey[] =>
   collectKeys(messages, (toolCallId) => {
      if (seen.has(toolCallId)) return false;
      seen.add(toolCallId);
      return true;
   });
