import { ForbiddenException } from '@nestjs/common';

import { EntityStatus } from '@/generated/prisma/enums';

export const PUBLISHED_EDIT_FORBIDDEN_MESSAGE =
   'Changing published content requires the publish permission';

export const assertEditAllowed = (current: EntityStatus, canPublish: boolean): void => {
   if (!canPublish && current === EntityStatus.published) {
      throw new ForbiddenException(PUBLISHED_EDIT_FORBIDDEN_MESSAGE);
   }
};

export const assertSaveAllowed = (
   current: EntityStatus,
   next: EntityStatus | undefined,
   canPublish: boolean,
): void => {
   assertEditAllowed(current, canPublish);
   assertStatusChangeAllowed(current, next, canPublish);
};

export const assertStatusChangeAllowed = (
   current: EntityStatus | null,
   next: EntityStatus | undefined,
   canPublish: boolean,
): void => {
   if (canPublish || next === undefined) return;
   const changes = next !== (current ?? EntityStatus.draft);
   if (changes) throw new ForbiddenException('Insufficient permissions');
};

export const publicationChange = (
   status: EntityStatus | undefined,
   current: EntityStatus | null,
): { status?: EntityStatus; publishedAt?: Date | null } => {
   if (status === undefined) return {};
   if (status === EntityStatus.draft) return { status, publishedAt: null };
   return current === EntityStatus.published ? { status } : { status, publishedAt: new Date() };
};
