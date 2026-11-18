/* eslint-disable */

import type { CreateProjectDto } from './CreateProjectDto';
import type { ProjectEntity } from './ProjectEntity';

export type ProjectControllerCreate201 = ProjectEntity;

export type ProjectControllerCreateMutationRequest = CreateProjectDto;

export type ProjectControllerCreateMutationResponse = ProjectControllerCreate201;

export type ProjectControllerCreateMutation = {
   Response: ProjectControllerCreate201;
   Request: ProjectControllerCreateMutationRequest;
   Errors: any;
};
