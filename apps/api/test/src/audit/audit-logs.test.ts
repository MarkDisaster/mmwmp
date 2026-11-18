import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { PrismaService } from '../../../src/prisma/prisma.service';
import { waitForAuditCount } from '../../setup/audit';
import { getApp, getHttpServer } from '../../setup/init';
import { tagBody } from '../../setup/tags';
import { createAdminAndLogin } from '../../setup/users';

describe('Audit logs (e2e)', () => {
   let prisma: PrismaService;

   beforeAll(() => {
      prisma = getApp().get(PrismaService);
   });

   const cleanupDb = async () => {
      await prisma.auditLog.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
   };

   beforeEach(cleanupDb);
   afterAll(cleanupDb);

   const list = (token: string, query: string) =>
      getHttpServer().get(`/audit/logs?${query}`).set('Authorization', `Bearer ${token}`);

   describe('GET /audit/logs', () => {
      it('should filter by a valid actorType', async () => {
         const token = await createAdminAndLogin();
         await prisma.auditLog.createMany({
            data: [
               { actorType: 'ai', action: 'project.create', resourceType: 'project' },
               { actorType: 'system', action: 'project.delete', resourceType: 'project' },
            ],
         });

         const response = await list(token, 'actorType=ai');

         expect(response.status).toBe(200);
         expect(response.body.data.map((l: { actorType: string }) => l.actorType)).toEqual(['ai']);
      });

      it('should reject an unknown actorType with 400 instead of failing in the database', async () => {
         const token = await createAdminAndLogin();

         const response = await list(token, 'actorType=robot');

         expect(response.status).toBe(400);
         expect(response.body.message).toEqual(
            expect.arrayContaining([expect.stringContaining('actorType must be one of')]),
         );
      });

      it('should send every field of an entry, null when empty, with the user and its role', async () => {
         const token = await createAdminAndLogin();
         const admin = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@test.com' } });
         await prisma.auditLog.create({
            data: {
               userId: admin.id,
               actorType: 'user',
               action: 'tag.create',
               resourceType: 'tag',
               resourceId: '7',
               metadata: { method: 'POST', path: '/tags', resourceName: 'News' },
            },
         });
         await prisma.auditLog.create({
            data: { actorType: 'system', action: 'tag.delete', resourceType: 'tag' },
         });

         const response = await list(token, 'resourceType=tag');

         expect(response.status).toBe(200);
         expect(response.body.totalCount).toBe(2);
         const byAction = (action: string) =>
            response.body.data.find((entry: { action: string }) => entry.action === action);
         expect(byAction('tag.create')).toEqual({
            id: expect.any(Number),
            userId: admin.id,
            user: {
               id: admin.id,
               email: 'admin@test.com',
               firstName: 'Test',
               lastName: 'User',
               role: { isAdmin: true },
            },
            actorType: 'user',
            action: 'tag.create',
            resourceType: 'tag',
            resourceId: '7',
            metadata: { method: 'POST', path: '/tags', resourceName: 'News' },
            ipAddress: null,
            userAgent: null,
            conversationId: null,
            createdAt: expect.any(String),
         });
         expect(byAction('tag.delete')).toMatchObject({
            userId: null,
            user: null,
            resourceId: null,
            metadata: null,
         });
      });
   });

   describe('OpenAPI', () => {
      type Schema = {
         required?: string[];
         properties?: Record<string, Schema & { nullable?: boolean }>;
         type?: string;
         nullable?: boolean;
         additionalProperties?: unknown;
      };
      const schemas = () =>
         (
            SwaggerModule.createDocument(getApp(), new DocumentBuilder().build()) as unknown as {
               components: { schemas: Record<string, Schema> };
            }
         ).components.schemas;

      it('should require every field of an entry, as every entry sends them', () => {
         const { AuditLogEntity } = schemas();

         expect([...(AuditLogEntity.required ?? [])].sort()).toEqual(
            Object.keys(AuditLogEntity.properties ?? {}).sort(),
         );
      });

      it('should document the user with its role and the metadata as a free-form object', () => {
         const { AuditLogEntity, AuditLogUserEntity, AuditLogUserRoleEntity } = schemas();

         expect(AuditLogUserEntity.required).toEqual(expect.arrayContaining(['role']));
         expect(AuditLogUserRoleEntity.required).toEqual(['isAdmin']);
         expect(AuditLogEntity.properties?.metadata).toMatchObject({
            type: 'object',
            nullable: true,
            additionalProperties: true,
            properties: { resourceName: { type: 'string' } },
         });
      });
   });

   describe('the address of an audited request', () => {
      it('is the X-Real-IP of the edge, not an X-Forwarded-For the caller sent', async () => {
         const token = await createAdminAndLogin();

         const response = await getHttpServer()
            .post('/tags')
            .set('Authorization', `Bearer ${token}`)
            .set('X-Real-IP', '198.51.100.7')
            .set('X-Forwarded-For', '203.0.113.7')
            .send(tagBody('react', 'React'));

         expect(response.status).toBe(201);
         expect(await waitForAuditCount(prisma, { action: 'tag.create' })).toBe(1);
         const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: 'tag.create' } });
         expect(entry.ipAddress).toBe('198.51.100.7');
      });
   });
});
