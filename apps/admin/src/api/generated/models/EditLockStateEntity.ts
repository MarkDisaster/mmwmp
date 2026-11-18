/* eslint-disable */

import type { EditLockHolderEntity } from './EditLockHolderEntity';

export type EditLockStateEntity = {
   heldBy: EditLockHolderEntity | null;
   mine: boolean;
};
