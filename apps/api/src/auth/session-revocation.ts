import type { Prisma } from '@/generated/prisma/client';
import type { PrismaService } from '@/prisma/prisma.service';

export const revokeAllSessions = async (
   client: PrismaService | Prisma.TransactionClient,
   userId: number,
): Promise<number> => {
   const { count } = await client.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
   });
   return count;
};

export const isIssuedBeforeValidAfter = (
   iat: unknown,
   validAfter: Date | null | undefined,
): boolean =>
   !!validAfter && (typeof iat !== 'number' || iat <= Math.floor(validAfter.getTime() / 1000));
