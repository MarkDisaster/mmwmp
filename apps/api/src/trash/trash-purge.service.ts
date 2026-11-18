import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuditService } from '@/audit/audit.service';
import { FileService } from '@/file/file.service';
import { ProjectService } from '@/project/project.service';
import { ServiceService } from '@/service/service.service';
import { TagService } from '@/tag/tag.service';

import { TRASH_PURGE_LIMITS, type TrashPurgeLimits } from './trash-purge.constants';

export type TrashPurgeable = {
   type: 'project' | 'service' | 'tag' | 'file';
   findExpiredTrashIds(cutoff: Date, limit: number, excludeIds?: number[]): Promise<number[]>;
   removePermanently(id: number): Promise<{ title: string; originalSlug?: string | null }>;
};

export type PurgeResult = {
   purged: number;
   skipped: number;
   capped: boolean;
};

@Injectable()
export class TrashPurgeService {
   private readonly logger = new Logger(TrashPurgeService.name);
   readonly resources: TrashPurgeable[];

   constructor(
      private readonly config: ConfigService,
      private readonly audit: AuditService,
      projects: ProjectService,
      services: ServiceService,
      tags: TagService,
      files: FileService,
   ) {
      this.resources = [
         { type: 'project', ...bind(projects) },
         { type: 'service', ...bind(services) },
         { type: 'tag', ...bind(tags) },
         { type: 'file', ...bind(files) },
      ];
   }

   async purgeExpired(
      now = new Date(),
      limits: TrashPurgeLimits = TRASH_PURGE_LIMITS,
   ): Promise<PurgeResult> {
      const retentionDays = this.config.getOrThrow<number>('app.trashRetentionDays');
      const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
      const result: PurgeResult = { purged: 0, skipped: 0, capped: false };

      for (const resource of this.resources) {
         const attemptedIds: number[] = [];
         const skippedIds: number[] = [];
         let purged = 0;
         while (purged < limits.maxPerRun) {
            const ids = await resource.findExpiredTrashIds(cutoff, limits.maxPerRun - purged, [
               ...attemptedIds,
            ]);
            if (ids.length === 0) break;
            for (const id of ids) {
               attemptedIds.push(id);
               let removed: Awaited<ReturnType<TrashPurgeable['removePermanently']>>;
               try {
                  removed = await resource.removePermanently(id);
               } catch (error) {
                  if (error instanceof NotFoundException) continue;
                  skippedIds.push(id);
                  this.logger.debug(
                     `Trash purge skipped ${resource.type} ${id}: ${(error as Error).message}`,
                  );
                  continue;
               }
               purged += 1;
               try {
                  await this.audit.log({
                     actorType: 'system',
                     action: `${resource.type}.purge`,
                     resourceType: resource.type,
                     resourceId: id,
                     metadata: {
                        title: removed.title,
                        ...(removed.originalSlug && { originalSlug: removed.originalSlug }),
                        retentionDays,
                     },
                  });
               } catch (error) {
                  this.logger.error(
                     `Audit entry of the purge of ${resource.type} ${id} failed: ${(error as Error).message}`,
                  );
               }
            }
         }
         result.purged += purged;
         result.skipped += skippedIds.length;
         if (purged >= limits.maxPerRun) result.capped = true;
         if (skippedIds.length > 0) {
            this.logger.warn(
               `Trash purge skipped ${skippedIds.length} ${resource.type} row(s) that cannot be deleted now (still in use or failing), ids ${skippedIds.slice(0, 20).join(', ')}${skippedIds.length > 20 ? ', ...' : ''}; they stay in the trash and are tried again next run`,
            );
         }
      }

      if (result.capped) {
         this.logger.warn(
            `Trash purge hit its cap of ${limits.maxPerRun} rows per resource; the rest waits for the next run`,
         );
      }
      this.logger.log(
         `Trash purge deleted ${result.purged} rows, skipped ${result.skipped} (retention ${retentionDays} days)`,
      );
      return result;
   }
}

const bind = (service: Omit<TrashPurgeable, 'type'>) => ({
   findExpiredTrashIds: (cutoff: Date, limit: number, excludeIds?: number[]) =>
      service.findExpiredTrashIds(cutoff, limit, excludeIds),
   removePermanently: (id: number) => service.removePermanently(id),
});
