import { hkdfSync } from 'node:crypto';

import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import {
   Injectable,
   Logger,
   type OnApplicationBootstrap,
   ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
   convertToModelMessages,
   type LanguageModel,
   stepCountIs,
   streamText,
   type SystemModelMessage,
   type UIMessage,
} from 'ai';

import { ANTHROPIC_MODEL_ID, GOOGLE_MODEL_ID, type ProviderId } from '@/ai/models';
import { AiInteractionService } from '@/ai/observability/ai-interaction.service';
import { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { AiToolRegistryService } from '@/ai/tools/ai-tool-registry.service';
import type { ToolContext } from '@/ai/tools/tool-auth';

import { buildPageContextPrompt, type ResolvedPageContext } from './page-context.service';

const PERSONA_PROMPT_NAME = 'aurora-admin';
const MAX_AGENT_STEPS = 8;
const DEFAULT_MAX_OUTPUT_TOKENS = 16_384;
const DEFAULT_TURN_TIMEOUT_MS = 5 * 60_000;

const buildSystemMessages = (persona: string, pageContext: string | null): SystemModelMessage[] => [
   {
      role: 'system',
      content: persona,
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
   },
   ...(pageContext ? [{ role: 'system' as const, content: pageContext }] : []),
];

@Injectable()
export class ChatService implements OnApplicationBootstrap {
   private readonly logger = new Logger(ChatService.name);

   constructor(
      private readonly config: ConfigService,
      private readonly prompts: PromptRegistryService,
      private readonly aiInteractions: AiInteractionService,
      private readonly toolRegistry: AiToolRegistryService,
   ) {}

   async streamAgent(
      messages: UIMessage[],
      context: ToolContext,
      page?: ResolvedPageContext | null,
      abortSignal?: AbortSignal,
   ) {
      const persona = this.loadPersona();
      const system = buildSystemMessages(persona, buildPageContextPrompt(page ?? null));

      const { providerId, model, modelId } = this.resolveModel();
      const start = Date.now();
      const userId = context.user.id;
      let aborted = false;

      const tools = this.toolRegistry.getToolSet(context);

      return streamText({
         model,
         system,
         messages: await convertToModelMessages(messages, { tools }),
         experimental_context: context,
         tools,
         activeTools: this.toolRegistry.getActiveToolNames(context),
         experimental_toolApprovalSecret: this.toolApprovalSecret(context),
         stopWhen: stepCountIs(MAX_AGENT_STEPS),
         maxOutputTokens:
            this.config.get<number>('AI_CHAT_MAX_OUTPUT_TOKENS') ?? DEFAULT_MAX_OUTPUT_TOKENS,
         abortSignal,
         timeout: {
            totalMs: this.config.get<number>('AI_CHAT_TURN_TIMEOUT_MS') ?? DEFAULT_TURN_TIMEOUT_MS,
         },
         onError: ({ error }) => {
            const err = error instanceof Error ? error : new Error(String(error));
            const message = err.message;
            this.logger.error(
               `Agent stream error (conversation ${context.conversationId}): ${err.name}: ${message.slice(0, 1000)}` +
                  (err.cause ? ` | cause: ${String(err.cause).slice(0, 1000)}` : ''),
               err.stack,
            );
            void this.aiInteractions.record({
               conversationId: context.conversationId,
               userId,
               provider: providerId,
               model: modelId,
               inputTokens: 0,
               outputTokens: 0,
               totalTokens: 0,
               latencyMs: Date.now() - start,
               toolCallCount: 0,
               stepCount: 0,
               finishReason: 'error',
               error: message.slice(0, 1000),
            });
         },
         onFinish: ({ totalUsage, finishReason, steps }) => {
            if (aborted) return;
            const toolCallCount = steps.reduce((acc, step) => acc + step.toolCalls.length, 0);
            void this.aiInteractions.record({
               conversationId: context.conversationId,
               userId,
               provider: providerId,
               model: modelId,
               inputTokens: totalUsage.inputTokens ?? 0,
               outputTokens: totalUsage.outputTokens ?? 0,
               totalTokens: totalUsage.totalTokens ?? 0,
               cacheReadTokens: totalUsage.inputTokenDetails.cacheReadTokens ?? null,
               cacheWriteTokens: totalUsage.inputTokenDetails.cacheWriteTokens ?? null,
               latencyMs: Date.now() - start,
               toolCallCount,
               stepCount: steps.length,
               finishReason,
            });
         },
         onAbort: ({ steps }) => {
            aborted = true;
            const sum = (pick: (step: (typeof steps)[number]) => number | undefined) =>
               steps.reduce((acc, step) => acc + (pick(step) ?? 0), 0);
            void this.aiInteractions.record({
               conversationId: context.conversationId,
               userId,
               provider: providerId,
               model: modelId,
               inputTokens: sum((step) => step.usage.inputTokens),
               outputTokens: sum((step) => step.usage.outputTokens),
               totalTokens: sum((step) => step.usage.totalTokens),
               cacheReadTokens: sum((step) => step.usage.inputTokenDetails.cacheReadTokens),
               cacheWriteTokens: sum((step) => step.usage.inputTokenDetails.cacheWriteTokens),
               latencyMs: Date.now() - start,
               toolCallCount: sum((step) => step.toolCalls.length),
               stepCount: steps.length,
               finishReason: 'aborted',
            });
         },
      });
   }

   onApplicationBootstrap(): void {
      try {
         this.loadPersona();
      } catch {
         // Logged by `loadPersona`; every chat request answers 503 until the prompt is there.
      }
   }

   assertAvailable(): void {
      this.loadPersona();
   }

   private loadPersona(): string {
      const persona = this.prompts.has(PERSONA_PROMPT_NAME)
         ? this.prompts.render(PERSONA_PROMPT_NAME)
         : '';
      if (!persona.trim()) {
         this.logger.error(`Persona prompt "${PERSONA_PROMPT_NAME}" is missing or empty.`);
         throw new ServiceUnavailableException('The AI assistant is not available.');
      }
      return persona;
   }

   private toolApprovalSecret({ user, conversationId }: ToolContext): string | undefined {
      const secret = this.config.get<string>('AI_TOOL_APPROVAL_SECRET');
      if (!secret) return undefined;
      const info = `aurora-tool-approval\n${user.id}\n${conversationId}`;
      return Buffer.from(hkdfSync('sha256', secret, '', info, 32)).toString('base64url');
   }

   private resolveModel(): { providerId: ProviderId; model: LanguageModel; modelId: string } {
      const configured = this.config.get<ProviderId>('LLM_PROVIDER') ?? 'google';
      if (configured === 'anthropic') {
         return {
            providerId: 'anthropic',
            model: anthropic(ANTHROPIC_MODEL_ID),
            modelId: ANTHROPIC_MODEL_ID,
         };
      }
      return {
         providerId: 'google',
         model: google(GOOGLE_MODEL_ID),
         modelId: GOOGLE_MODEL_ID,
      };
   }
}
