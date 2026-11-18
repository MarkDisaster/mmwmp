/* eslint-disable */

import type { ServiceProjectItemEntity } from './ServiceProjectItemEntity';

export type ServiceProjectEntity = {
   serviceId: number;
   projectId: number;
   sortOrder: number;
   project: ServiceProjectItemEntity;
};
