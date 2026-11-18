import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Job, Queue } from 'bullmq';

import type { AuditService } from '@/audit/audit.service';
import type { FileService } from '@/file/file.service';
import type { ProjectService } from '@/project/project.service';
import type { ServiceService } from '@/service/service.service';
import type { TagService } from '@/tag/tag.service';

import { TrashPurgeProcessor } from '../trash-purge.processor';
import { TrashPurgeQueue } from '../trash-purge.queue';
import { TrashPurgeService } from '../trash-purge.service';

const DAY = 86_400_000;
const NOW = new Date('2026-06-30T12:00:00.000Z');

const config = (values: Record<string, unknown>) => {
   const all: Record<string, unknown> = { 'app.trashRetentionDays': 30, ...values };
   return {
      get: jest.fn((key: string, fallback: unknown) => (key in all ? all[key] : fallback)),
      getOrThrow: jest.fn((key: string) => all[key]),
   } as unknown as ConfigService;
};

describe('TrashPurgeService', () => {
   const makeResource = () => ({
      findExpiredTrashIds: jest.fn().mockResolvedValue([]),
      removePermanently: jest.fn().mockResolvedValue({ title: 'T', originalSlug: 'slug' }),
   });
   let audit: { log: jest.Mock };
   let projects: ReturnType<typeof makeResource>;
   let services: ReturnType<typeof makeResource>;
   let tags: ReturnType<typeof makeResource>;
   let files: ReturnType<typeof makeResource>;

   const service = (values: Record<string, unknown> = {}) =>
      new TrashPurgeService(
         config(values),
         audit as unknown as AuditService,
         projects as unknown as ProjectService,
         services as unknown as ServiceService,
         tags as unknown as TagService,
         files as unknown as FileService,
      );

   beforeEach(() => {
      audit = { log: jest.fn().mockResolvedValue(undefined) };
      projects = makeResource();
      services = makeResource();
      tags = makeResource();
      files = makeResource();
      jest.spyOn(Logger.prototype, 'log').mockImplementation();
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();
   });

   afterEach(() => jest.restoreAllMocks());

   it('looks for rows trashed before now minus the retention (30 days by default)', async () => {
      await service().purgeExpired(NOW);

      for (const resource of [projects, services, tags, files]) {
         expect(resource.findExpiredTrashIds).toHaveBeenCalledWith(
            new Date(NOW.getTime() - 30 * DAY),
            500,
            [],
         );
      }
   });

   it('takes the retention from TRASH_RETENTION_DAYS', async () => {
      await service({ 'app.trashRetentionDays': 7 }).purgeExpired(NOW);

      expect(projects.findExpiredTrashIds).toHaveBeenCalledWith(
         new Date(NOW.getTime() - 7 * DAY),
         500,
         [],
      );
   });

   it('deletes every expired row and writes a system audit entry for each', async () => {
      projects.findExpiredTrashIds.mockResolvedValueOnce([1, 2]);
      files.findExpiredTrashIds.mockResolvedValueOnce([9]);
      files.removePermanently.mockResolvedValue({ title: 'a.jpg', originalSlug: null });

      const result = await service().purgeExpired(NOW);

      expect(result).toEqual({ purged: 3, skipped: 0, capped: false });
      expect(projects.removePermanently.mock.calls).toEqual([[1], [2]]);
      expect(audit.log).toHaveBeenCalledTimes(3);
      expect(audit.log).toHaveBeenCalledWith({
         actorType: 'system',
         action: 'project.purge',
         resourceType: 'project',
         resourceId: 1,
         metadata: { title: 'T', originalSlug: 'slug', retentionDays: 30 },
      });
      expect(audit.log).toHaveBeenCalledWith(
         expect.objectContaining({
            action: 'file.purge',
            metadata: { title: 'a.jpg', retentionDays: 30 },
         }),
      );
   });

   it('skips a row restored or purged meanwhile without counting it', async () => {
      projects.findExpiredTrashIds.mockResolvedValueOnce([1, 2]);
      projects.removePermanently
         .mockRejectedValueOnce(new NotFoundException())
         .mockResolvedValueOnce({ title: 'T' });

      const result = await service().purgeExpired(NOW);

      expect(result).toMatchObject({ purged: 1, skipped: 0 });
      expect(audit.log).toHaveBeenCalledTimes(1);
   });

   it('ends the run when a NotFound row stays in the trash (a mapped foreign key failure)', async () => {
      let batches = 0;
      projects.findExpiredTrashIds.mockImplementation(
         (_cutoff: Date, _limit: number, excludeIds: number[]) => {
            batches += 1;
            if (batches > 3) return Promise.reject(new Error('the purge asks for row 1 again'));
            return Promise.resolve(excludeIds.includes(1) ? [] : [1]);
         },
      );
      projects.removePermanently.mockRejectedValue(new NotFoundException('Not found'));

      const result = await service().purgeExpired(NOW);

      expect(result).toEqual({ purged: 0, skipped: 0, capped: false });
      expect(projects.removePermanently).toHaveBeenCalledTimes(1);
   });

   it('leaves a row that is still in use in the trash and goes on with the rest', async () => {
      files.findExpiredTrashIds.mockResolvedValueOnce([5, 6]);
      files.removePermanently
         .mockRejectedValueOnce(new ConflictException('File is still used by a project'))
         .mockResolvedValueOnce({ title: 'b.jpg' });

      const result = await service().purgeExpired(NOW);

      expect(result).toMatchObject({ purged: 1, skipped: 1 });
      expect(audit.log).toHaveBeenCalledTimes(1);
   });

   it('logs a failed audit entry after a successful purge and does not count it as skipped', async () => {
      projects.findExpiredTrashIds.mockResolvedValueOnce([1]);
      audit.log.mockRejectedValue(new Error('audit down'));
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      const result = await service().purgeExpired(NOW);

      expect(result).toMatchObject({ purged: 1, skipped: 0 });
      expect(error).toHaveBeenCalledWith(expect.stringContaining('audit down'));
   });

   it('counts an unexpected failure as skipped and does not stop the run', async () => {
      projects.findExpiredTrashIds.mockResolvedValueOnce([1]);
      projects.removePermanently.mockRejectedValue(new Error('db down'));
      tags.findExpiredTrashIds.mockResolvedValueOnce([3]);

      const result = await service().purgeExpired(NOW);

      expect(result).toMatchObject({ purged: 1, skipped: 1 });
      expect(tags.removePermanently).toHaveBeenCalledWith(3);
   });

   it('does not let skipped rows block newer expired ones, and tries them again next run', async () => {
      files.findExpiredTrashIds
         .mockResolvedValueOnce([1, 2])
         .mockResolvedValueOnce([3])
         .mockResolvedValueOnce([]);
      files.removePermanently
         .mockRejectedValueOnce(new ConflictException('in use'))
         .mockRejectedValueOnce(new ConflictException('in use'))
         .mockResolvedValueOnce({ title: 'c.jpg' });

      const result = await service().purgeExpired(NOW, { maxPerRun: 2 });

      expect(result).toMatchObject({ purged: 1, skipped: 2 });
      expect(
         files.findExpiredTrashIds.mock.calls.map(([, limit, exclude]) => [limit, exclude]),
      ).toEqual([
         [2, []],
         [2, [1, 2]],
         [1, [1, 2, 3]],
      ]);

      files.findExpiredTrashIds.mockClear().mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([]);
      files.removePermanently.mockResolvedValue({ title: 'x' });
      await service().purgeExpired(NOW, { maxPerRun: 2 });
      expect(files.findExpiredTrashIds).toHaveBeenNthCalledWith(1, expect.any(Date), 2, []);
      expect(files.removePermanently).toHaveBeenCalledWith(1);
   });

   it('logs one warning for all the rows skipped in a resource, not one for each', async () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      files.findExpiredTrashIds.mockResolvedValueOnce([1, 2, 3]).mockResolvedValueOnce([]);
      files.removePermanently.mockRejectedValue(new ConflictException('in use'));

      await service().purgeExpired(NOW);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('skipped 3 file row(s)'));
   });

   it('reports the cap when a resource has as many expired rows as one run may delete', async () => {
      projects.findExpiredTrashIds.mockResolvedValueOnce([1, 2]);

      const result = await service().purgeExpired(NOW, { maxPerRun: 2 });

      expect(result).toMatchObject({ purged: 2, capped: true });
      expect(projects.findExpiredTrashIds).toHaveBeenCalledWith(expect.any(Date), 2, []);
   });
});

describe('TrashPurgeQueue', () => {
   const queue = { upsertJobScheduler: jest.fn(), removeJobScheduler: jest.fn() };

   beforeEach(() => {
      queue.upsertJobScheduler.mockReset().mockResolvedValue({});
      queue.removeJobScheduler.mockReset().mockResolvedValue(true);
   });

   it('upserts one daily scheduler under a fixed id, so every instance shares it', async () => {
      await new TrashPurgeQueue(queue as unknown as Queue, config({})).onApplicationBootstrap();

      expect(queue.upsertJobScheduler).toHaveBeenCalledWith(
         'trash-purge-daily',
         { pattern: '15 4 * * *', tz: 'UTC' },
         expect.objectContaining({ name: 'purge' }),
      );
   });

   it('removes the scheduler when the kill switch is off', async () => {
      await new TrashPurgeQueue(
         queue as unknown as Queue,
         config({ 'app.trashPurgeEnabled': false }),
      ).onApplicationBootstrap();

      expect(queue.removeJobScheduler).toHaveBeenCalledWith('trash-purge-daily');
      expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
   });

   it('logs a failure instead of stopping the API from starting', async () => {
      queue.upsertJobScheduler.mockRejectedValue(new Error('no Redis'));
      const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      await expect(
         new TrashPurgeQueue(queue as unknown as Queue, config({})).onApplicationBootstrap(),
      ).resolves.toBeUndefined();
      expect(error).toHaveBeenCalledWith(expect.stringContaining('no Redis'));
   });
});

describe('TrashPurgeProcessor', () => {
   const purge = { purgeExpired: jest.fn() };
   const processor = (values: Record<string, unknown>) =>
      new TrashPurgeProcessor(purge as unknown as TrashPurgeService, config(values));

   beforeEach(() => purge.purgeExpired.mockReset());

   it('runs the purge and returns its result', async () => {
      const result = { purged: 2, skipped: 0, capped: false };
      purge.purgeExpired.mockResolvedValue(result);

      expect(await processor({}).process({ name: 'purge', id: '1' } as Job)).toBe(result);
   });

   it('does nothing while the kill switch is off', async () => {
      expect(
         await processor({ 'app.trashPurgeEnabled': false }).process({
            name: 'purge',
            id: '1',
         } as Job),
      ).toBeNull();
      expect(purge.purgeExpired).not.toHaveBeenCalled();
   });

   it('ignores a job of another name', async () => {
      jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      expect(await processor({}).process({ name: 'other', id: '1' } as Job)).toBeNull();
      expect(purge.purgeExpired).not.toHaveBeenCalled();
   });
});
