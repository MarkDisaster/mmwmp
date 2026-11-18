import type { Prisma } from '../../prisma/generated/prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';

export const waitForAuditCount = async (
   prisma: PrismaService,
   where: Prisma.AuditLogWhereInput,
   expected = 1,
   timeoutMs = 5_000,
) => {
   const deadline = Date.now() + timeoutMs;
   let count = await prisma.auditLog.count({ where });
   while (count < expected && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      count = await prisma.auditLog.count({ where });
   }
   return count;
};
