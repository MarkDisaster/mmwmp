import { Module } from '@nestjs/common';

import { AiObservabilityModule } from './observability/ai-observability.module';
import { PromptRegistryService } from './prompts/prompt-registry.service';
import { AiToolsModule } from './tools/ai-tools.module';
import { VoiceModule } from './voice/voice.module';

@Module({
   imports: [VoiceModule, AiObservabilityModule, AiToolsModule],
   providers: [PromptRegistryService],
   exports: [PromptRegistryService, VoiceModule, AiObservabilityModule],
})
export class AiModule {}
