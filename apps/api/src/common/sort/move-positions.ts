export const MOVE_POSITIONS = ['before', 'after'] as const;

export type MovePosition = (typeof MOVE_POSITIONS)[number];
