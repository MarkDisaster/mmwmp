import { BadRequestException } from '@nestjs/common';

type SameIdsMessages = {
   duplicates: string;
   count: string;
   unknown: (id: number) => string;
};

export function assertSameIds(
   incoming: number[],
   existing: Iterable<number>,
   messages: SameIdsMessages,
): void {
   const incomingIds = new Set(incoming);
   const existingIds = new Set(existing);

   if (incoming.length !== incomingIds.size) {
      throw new BadRequestException(messages.duplicates);
   }

   if (existingIds.size !== incomingIds.size) {
      throw new BadRequestException(messages.count);
   }

   for (const id of incomingIds) {
      if (!existingIds.has(id)) {
         throw new BadRequestException(messages.unknown(id));
      }
   }
}
