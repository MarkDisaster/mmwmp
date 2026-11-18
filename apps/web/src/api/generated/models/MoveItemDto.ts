/* eslint-disable */

export const moveItemDtoPositionEnum = {
   before: 'before',
   after: 'after',
} as const;

export type MoveItemDtoPositionEnumKey =
   (typeof moveItemDtoPositionEnum)[keyof typeof moveItemDtoPositionEnum];

export type MoveItemDto = {
   targetId: number;
   position: MoveItemDtoPositionEnumKey;
   version?: number;
};
