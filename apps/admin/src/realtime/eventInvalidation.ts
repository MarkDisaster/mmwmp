import type { QueryKey } from '@tanstack/react-query';

import type { AdminEventEntity } from '@/api/generated';
import { editLockEntityEnum } from '@/api/generated';
import { getEntityInvalidationKeys } from '@/utils/entityInvalidation';

export const getEventInvalidationKeys = ({
   entity,
   action,
}: Pick<AdminEventEntity, 'entity' | 'action'>): QueryKey[] =>
   getEntityInvalidationKeys([entity], { trash: action === 'deleted' || action === 'restored' });

export const getAllEventInvalidationKeys = (): QueryKey[] =>
   getEntityInvalidationKeys(Object.values(editLockEntityEnum), { trash: true });
