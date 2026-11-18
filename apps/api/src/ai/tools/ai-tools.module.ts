import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { EditLockModule } from '@/edit-lock/edit-lock.module';

import { AiToolRegistryService } from './ai-tool-registry.service';
import { ToolAuditService } from './tool-audit.service';

@Global()
@Module({
   imports: [DiscoveryModule, EditLockModule],
   providers: [ToolAuditService, AiToolRegistryService],
   exports: [ToolAuditService, AiToolRegistryService],
})
export class AiToolsModule {}
