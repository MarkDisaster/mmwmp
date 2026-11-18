import { ForbiddenException } from '@nestjs/common';

import { EntityStatus } from '@/generated/prisma/enums';

import {
   assertEditAllowed,
   assertSaveAllowed,
   assertStatusChangeAllowed,
   publicationChange,
   PUBLISHED_EDIT_FORBIDDEN_MESSAGE,
} from '../publication';

const { draft, published } = EntityStatus;

describe('assertStatusChangeAllowed', () => {
   it.each([
      ['a new row without a status', null, undefined],
      ['a new row as a draft', null, draft],
      ['an existing row without a status', published, undefined],
      ['the stored status sent again', published, published],
      ['the stored draft sent again', draft, draft],
   ])('allows %s without the publish permission', (_case, current, next) => {
      expect(() => assertStatusChangeAllowed(current, next, false)).not.toThrow();
   });

   it.each([
      ['publishing a new row', null, published],
      ['publishing a draft', draft, published],
      ['unpublishing', published, draft],
   ])('refuses %s without the publish permission', (_case, current, next) => {
      expect(() => assertStatusChangeAllowed(current, next, false)).toThrow(ForbiddenException);
   });

   it('allows every change with the publish permission', () => {
      expect(() => assertStatusChangeAllowed(draft, published, true)).not.toThrow();
      expect(() => assertStatusChangeAllowed(null, published, true)).not.toThrow();
   });
});

describe('assertEditAllowed', () => {
   it('lets every role with the update permission edit a draft', () => {
      expect(() => assertEditAllowed(draft, false)).not.toThrow();
   });

   it('refuses an edit of published content without the publish permission', () => {
      expect(() => assertEditAllowed(published, false)).toThrow(
         new ForbiddenException(PUBLISHED_EDIT_FORBIDDEN_MESSAGE),
      );
   });

   it('lets a role with the publish permission edit published content', () => {
      expect(() => assertEditAllowed(published, true)).not.toThrow();
   });
});

describe('assertSaveAllowed', () => {
   it('allows a save of a draft that keeps its status without the publish permission', () => {
      expect(() => assertSaveAllowed(draft, undefined, false)).not.toThrow();
      expect(() => assertSaveAllowed(draft, draft, false)).not.toThrow();
   });

   it.each([
      ['a published row with its status', published, published],
      ['a published row without a status', published, undefined],
      ['publishing a draft', draft, published],
      ['unpublishing', published, draft],
   ])('refuses %s without the publish permission', (_case, current, next) => {
      expect(() => assertSaveAllowed(current, next, false)).toThrow(ForbiddenException);
   });

   it('allows everything with the publish permission', () => {
      expect(() => assertSaveAllowed(published, draft, true)).not.toThrow();
      expect(() => assertSaveAllowed(published, published, true)).not.toThrow();
   });
});

describe('publicationChange', () => {
   it('changes nothing without a status', () => {
      expect(publicationChange(undefined, EntityStatus.draft)).toEqual({});
   });

   it('sets publishedAt when a draft or a new row is published', () => {
      for (const current of [EntityStatus.draft, null]) {
         const change = publicationChange(EntityStatus.published, current);
         expect(change.status).toBe(EntityStatus.published);
         expect(change.publishedAt).toBeInstanceOf(Date);
      }
   });

   it('keeps publishedAt of a row that stays published', () => {
      expect(publicationChange(EntityStatus.published, EntityStatus.published)).toEqual({
         status: EntityStatus.published,
      });
   });

   it('clears publishedAt when the row goes back to draft', () => {
      expect(publicationChange(EntityStatus.draft, EntityStatus.published)).toEqual({
         status: EntityStatus.draft,
         publishedAt: null,
      });
   });

   it.each([EntityStatus.draft, EntityStatus.published, null])(
      'clears publishedAt when a %s row goes to draft',
      (current) => {
         expect(publicationChange(EntityStatus.draft, current)).toEqual({
            status: EntityStatus.draft,
            publishedAt: null,
         });
      },
   );
});
