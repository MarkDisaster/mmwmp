export const trashQueryKeys = {
   all: ['trash'] as const,
   type: (type: string) => ['trash', type] as const,
};
