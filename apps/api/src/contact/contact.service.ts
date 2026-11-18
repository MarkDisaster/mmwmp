import { Injectable } from '@nestjs/common';

import { CacheService } from '@/cache/cache.service';
import { incrementVersion } from '@/common/concurrency/record-version';
import { sanitizePlainText } from '@/common/sanitize/sanitize-plain-text';
import { sanitizeRichText } from '@/common/sanitize/sanitize-rich-text';
import { EditLockEntity } from '@/edit-lock/enum/edit-lock-entity.enum';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { type SaveErrorMessages, withSaveErrors } from '@/prisma/save-error.helper';
import { AdminEventsService } from '@/realtime/admin-events.service';
import { AdminEventAction } from '@/realtime/enum/admin-event-action.enum';
import { RevalidationService } from '@/revalidation/revalidation.service';

import type { UpsertContactDto } from './dto/upsert-contact.dto';

const CACHE_KEY_CONTACT = 'contact:public';
const CACHE_TTL = 300;

const CONTACT_SAVE_ERRORS: SaveErrorMessages = {
   referenceMissing: 'Contact not found',
};

type PublicContact = Omit<Prisma.ContactGetPayload<{ include: { translations: true } }>, 'version'>;

@Injectable()
export class ContactService {
   constructor(
      private prisma: PrismaService,
      private cache: CacheService,
      private revalidation: RevalidationService,
      private adminEvents: AdminEventsService,
   ) {}

   find() {
      return this.prisma.contact.findFirst({ include: { translations: true } });
   }

   async findPublic(): Promise<PublicContact | null> {
      const cached = await this.cache.get<PublicContact>(CACHE_KEY_CONTACT);
      if (cached) return cached;

      const result = await this.prisma.contact.findFirst({
         include: { translations: true },
         omit: { version: true },
      });

      if (result) {
         void this.cache.set(CACHE_KEY_CONTACT, result, CACHE_TTL);
      }

      return result;
   }

   async upsert(dto: Partial<UpsertContactDto>) {
      const data = {
         ...(dto.companyName !== undefined && { companyName: dto.companyName }),
         ...(dto.phone !== undefined && { phone: dto.phone }),
         ...(dto.email !== undefined && { email: dto.email }),
         ...(dto.street !== undefined && { street: dto.street }),
         ...(dto.zip !== undefined && { zip: dto.zip }),
         ...(dto.city !== undefined && { city: dto.city }),
         ...(dto.ico !== undefined && { ico: dto.ico }),
         ...(dto.vatPayer !== undefined && { vatPayer: dto.vatPayer }),
         ...(dto.linkedinUrl !== undefined && { linkedinUrl: dto.linkedinUrl }),
         ...(dto.githubUrl !== undefined && { githubUrl: dto.githubUrl }),
      };

      const result = await withSaveErrors(
         () =>
            this.prisma.$transaction(
               async (tx) => {
                  const existing = await tx.contact.findFirst();
                  if (existing) {
                     await incrementVersion(tx, {
                        table: 'contacts',
                        id: existing.id,
                        expectedVersion: dto.version,
                     });
                  }
                  const contact = existing
                     ? await tx.contact.update({ where: { id: existing.id }, data })
                     : await tx.contact.create({
                          data: {
                             companyName: dto.companyName ?? null,
                             phone: dto.phone ?? null,
                             email: dto.email ?? null,
                             street: dto.street ?? null,
                             zip: dto.zip ?? null,
                             city: dto.city ?? null,
                             ico: dto.ico ?? null,
                             vatPayer: dto.vatPayer ?? false,
                             linkedinUrl: dto.linkedinUrl ?? null,
                             githubUrl: dto.githubUrl ?? null,
                          },
                       });

                  if (dto.translations) {
                     await Promise.all(
                        dto.translations.map((t) =>
                           tx.contactTranslation.upsert({
                              where: {
                                 contactId_language: {
                                    contactId: contact.id,
                                    language: t.language,
                                 },
                              },
                              create: {
                                 contactId: contact.id,
                                 language: t.language,
                                 description: sanitizeRichText(t.description),
                                 aboutTitle: sanitizePlainText(t.aboutTitle),
                              },
                              update: {
                                 ...(t.description !== undefined && {
                                    description: sanitizeRichText(t.description),
                                 }),
                                 ...(t.aboutTitle !== undefined && {
                                    aboutTitle: sanitizePlainText(t.aboutTitle),
                                 }),
                              },
                           }),
                        ),
                     );
                  }

                  return tx.contact.findUnique({
                     where: { id: contact.id },
                     include: { translations: true },
                  });
               },
               { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
            ),
         CONTACT_SAVE_ERRORS,
      );

      await this.cache.del(CACHE_KEY_CONTACT);
      this.revalidation.revalidate('contact');
      if (result) {
         this.adminEvents.publish(
            EditLockEntity.contact,
            result.id,
            result.version === 0 ? AdminEventAction.created : AdminEventAction.updated,
            result.version,
         );
      }
      return result;
   }
}
