import { Test } from '@nestjs/testing';

import { PrismaService } from '@/prisma/prisma.service';

import { PageContextService } from '../page-context.service';

describe('PageContextService dependency injection', () => {
   it('resolves with its PrismaService dependency', async () => {
      const prisma = { project: { findUnique: jest.fn() } };
      const moduleRef = await Test.createTestingModule({
         providers: [PageContextService, { provide: PrismaService, useValue: prisma }],
      }).compile();

      const service = moduleRef.get(PageContextService);

      expect(service).toBeInstanceOf(PageContextService);
      expect((service as unknown as { prisma: unknown }).prisma).toBe(prisma);
   });
});
