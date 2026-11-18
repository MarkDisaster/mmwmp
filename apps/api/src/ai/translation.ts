import { google } from '@ai-sdk/google';
import {
   BadRequestException,
   GatewayTimeoutException,
   HttpException,
   HttpStatus,
   Logger,
} from '@nestjs/common';
import { generateText, Output } from 'ai';
import type { z } from 'zod';

import { GOOGLE_MODEL_ID } from '@/ai/models';
import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { TRANSLATION_CALLS_PER_WINDOW, TRANSLATION_WINDOW_SECONDS } from '@/ai/tools/limits';
import { Language } from '@/generated/prisma/enums';
import type { RateLimitService } from '@/rate-limit/rate-limit.service';

export const LANGUAGE_NAMES: Record<Language, string> = {
   [Language.cs]: 'Czech',
   [Language.en]: 'English',
};

export const sourceLanguageNames = (target: Language) =>
   Object.values(Language)
      .filter((language) => language !== target)
      .map((language) => LANGUAGE_NAMES[language])
      .join(' or ');

export const TRANSLATION_TIMEOUT_MS = 120_000;

export const MAX_TRANSLATION_SOURCE_LENGTH = 100_000;

const translationLimitKey = (userId: number) => `translation:generate:${userId}`;

export const assertTranslationSourceSize = (source: Record<string, string | null | undefined>) => {
   const length = Object.values(source).reduce((sum, value) => sum + (value?.length ?? 0), 0);
   if (length > MAX_TRANSLATION_SOURCE_LENGTH) {
      throw new BadRequestException(
         `The text to translate is too long: at most ${MAX_TRANSLATION_SOURCE_LENGTH} characters`,
      );
   }
};

export const assertTranslationWithinLimit = async (rateLimit: RateLimitService, userId: number) => {
   const limit = await rateLimit.hit(
      translationLimitKey(userId),
      TRANSLATION_CALLS_PER_WINDOW,
      TRANSLATION_WINDOW_SECONDS,
   );
   if (limit.allowed) return;
   throw new HttpException(
      {
         statusCode: HttpStatus.TOO_MANY_REQUESTS,
         message:
            `Translation limit reached: at most ${TRANSLATION_CALLS_PER_WINDOW} translations per ` +
            `hour. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
         retryAfterSeconds: limit.retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
   );
};

const logger = new Logger('Translation');

export const translateFields = async <T>(
   prompts: PromptRegistryService,
   targetLanguage: Language,
   source: Record<string, string | null | undefined>,
   schema: z.ZodType<T>,
): Promise<T> => {
   const signal = AbortSignal.timeout(TRANSLATION_TIMEOUT_MS);
   try {
      const { output } = await generateText({
         model: google(GOOGLE_MODEL_ID),
         output: Output.object({ schema }),
         messages: [
            {
               role: 'user',
               content: prompts.render('translation', {
                  targetLang: LANGUAGE_NAMES[targetLanguage],
                  source: JSON.stringify(source),
               }),
            },
         ],
         abortSignal: signal,
      });
      return output;
   } catch (error) {
      if (signal.aborted) {
         logger.error(`Translation model timed out after ${TRANSLATION_TIMEOUT_MS} ms`);
         throw new GatewayTimeoutException('The translation model did not respond in time.');
      }
      throw error;
   }
};
