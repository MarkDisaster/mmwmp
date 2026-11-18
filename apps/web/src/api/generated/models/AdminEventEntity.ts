/* eslint-disable */

import type { AdminEventAction } from './AdminEventAction';
import type { EditLockEntity } from './EditLockEntity';

export type AdminEventEntity = {
   entity: EditLockEntity;
   id: number;
   action: AdminEventAction;
   version: number | null;
};
