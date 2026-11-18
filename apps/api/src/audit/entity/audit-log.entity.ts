import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AuditActorType } from '@/generated/prisma/enums';

export class AuditLogUserRoleEntity {
   @ApiProperty()
   isAdmin!: boolean;
}

export class AuditLogUserEntity {
   @ApiProperty()
   id!: number;

   @ApiPropertyOptional({
      description: 'Sent only to a caller with the `users.read` permission, or to that user.',
   })
   email?: string;

   @ApiProperty()
   firstName!: string;

   @ApiProperty()
   lastName!: string;

   @ApiProperty({ type: () => AuditLogUserRoleEntity })
   role!: AuditLogUserRoleEntity;
}

export class AuditLogEntity {
   @ApiProperty()
   id!: number;

   @ApiProperty({ type: Number, nullable: true })
   userId!: number | null;

   @ApiProperty({ type: () => AuditLogUserEntity, nullable: true })
   user!: AuditLogUserEntity | null;

   @ApiProperty({ enum: AuditActorType })
   actorType!: AuditActorType;

   @ApiProperty()
   action!: string;

   @ApiProperty()
   resourceType!: string;

   @ApiProperty({ type: String, nullable: true })
   resourceId!: string | null;

   @ApiProperty({
      type: 'object',
      nullable: true,
      description:
         'Free-form JSON. REST mutations record `method`, `path` and, when present, `params`, ' +
         '`query`, `body`, `error` and `resourceName`; AI tool failures record `input` and `error`.',
      properties: {
         method: { type: 'string' },
         path: { type: 'string' },
         params: { type: 'object', additionalProperties: { type: 'string' } },
         query: { type: 'object', additionalProperties: true },
         body: { description: 'Request body with secrets redacted, any JSON value' },
         input: { description: 'Tool input with secrets redacted, any JSON value or null' },
         error: { type: 'string' },
         resourceName: { type: 'string' },
      },
      additionalProperties: true,
   })
   metadata!: Record<string, unknown> | null;

   @ApiProperty({ type: String, nullable: true })
   ipAddress!: string | null;

   @ApiProperty({ type: String, nullable: true })
   userAgent!: string | null;

   @ApiProperty({ type: String, nullable: true })
   conversationId!: string | null;

   @ApiProperty()
   createdAt!: Date;
}
