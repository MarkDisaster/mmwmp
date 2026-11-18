import { google } from '@ai-sdk/google';
import {
   BadRequestException,
   GatewayTimeoutException,
   HttpException,
   HttpStatus,
   Logger,
} from '@nestjs/common';
import { APICallError, NoObjectGeneratedError } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { z } from 'zod';

import type { PromptRegistryService } from '@/ai/prompts/prompt-registry.service';
import { Language } from '@/generated/prisma/enums';
import type { RateLimitService } from '@/rate-limit/rate-limit.service';

import {
   assertTranslationSourceSize,
   assertTranslationWithinLimit,
   LANGUAGE_NAMES,
   MAX_TRANSLATION_SOURCE_LENGTH,
   sourceLanguageNames,
   translateFields,
   TRANSLATION_TIMEOUT_MS,
} from '../translation';

jest.mock('@ai-sdk/google', () => ({ google: jest.fn() }));

const rateLimitAnswering = (allowed: boolean, retryAfterSeconds = 1800) => {
   const hit = jest.fn().mockResolvedValue({
      allowed,
      count: allowed ? 1 : 21,
      retryAfterSeconds,
      unavailable: false,
   });
   return { hit, rateLimit: { hit } as unknown as RateLimitService };
};

describe('assertTranslationWithinLimit', () => {
   it('counts the call under one key per user, 20 an hour', async () => {
      const { hit, rateLimit } = rateLimitAnswering(true);

      await assertTranslationWithinLimit(rateLimit, 7);

      expect(hit).toHaveBeenCalledWith('translation:generate:7', 20, 3600);
   });

   it('answers 429 with the seconds to wait once the window is used up', async () => {
      const { rateLimit } = rateLimitAnswering(false);

      const error = await assertTranslationWithinLimit(rateLimit, 7).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect((error as HttpException).getResponse()).toEqual({
         statusCode: HttpStatus.TOO_MANY_REQUESTS,
         message:
            'Translation limit reached: at most 20 translations per hour. Try again in 30 minutes.',
         retryAfterSeconds: 1800,
      });
      expect((error as HttpException).message).toContain('Translation limit reached');
   });
});

describe('assertTranslationSourceSize', () => {
   it('lets a source up to the limit through, nulls and missing fields counting as empty', () => {
      expect(() =>
         assertTranslationSourceSize({
            title: 'a'.repeat(MAX_TRANSLATION_SOURCE_LENGTH - 1),
            description: null,
            content: undefined,
            metaTitle: 'b',
         }),
      ).not.toThrow();
   });

   it('refuses a source whose fields together exceed the limit', () => {
      expect(() =>
         assertTranslationSourceSize({
            title: 'a',
            content: 'b'.repeat(MAX_TRANSLATION_SOURCE_LENGTH),
         }),
      ).toThrow(BadRequestException);
   });
});

describe('translateFields', () => {
   const schema = z.object({ title: z.string(), description: z.string().nullable() });
   const prompts = {
      render: jest.fn(
         (_name: string, vars: Record<string, string>) => `${vars.targetLang}: ${vars.source}`,
      ),
   } as unknown as PromptRegistryService;

   const modelAnswering = (text: string) =>
      new MockLanguageModelV3({
         doGenerate: async () => ({
            content: [{ type: 'text', text }],
            finishReason: { unified: 'stop', raw: undefined },
            usage: {
               inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
               outputTokens: { total: 1, text: 1, reasoning: undefined },
            },
            warnings: [],
         }),
      });

   afterEach(() => jest.restoreAllMocks());

   it('returns the fields as the schema parses them and names the target language', async () => {
      const model = modelAnswering('{"title":"Hospital","description":null}');
      jest.mocked(google).mockReturnValue(model);

      const output = await translateFields(prompts, Language.en, { title: 'Nemocnice' }, schema);

      expect(output).toEqual({ title: 'Hospital', description: null });
      expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain(
         'English: {\\"title\\":\\"Nemocnice\\"}',
      );
      expect(model.doGenerateCalls[0].responseFormat).toMatchObject({ type: 'json' });
   });

   it('rejects an answer that does not match the schema instead of passing it on', async () => {
      jest.mocked(google).mockReturnValue(modelAnswering('{"description":"no title"}'));

      const error = await translateFields(
         prompts,
         Language.en,
         { title: 'Nemocnice' },
         schema,
      ).catch((e: unknown) => e);

      expect(NoObjectGeneratedError.isInstance(error)).toBe(true);
   });

   it('bounds the whole call with the translation timeout', async () => {
      const timeout = jest.spyOn(AbortSignal, 'timeout');
      const model = modelAnswering('{"title":"Hospital","description":null}');
      jest.mocked(google).mockReturnValue(model);

      await translateFields(prompts, Language.en, { title: 'Nemocnice' }, schema);

      expect(timeout).toHaveBeenCalledWith(TRANSLATION_TIMEOUT_MS);
      expect(model.doGenerateCalls[0].abortSignal).toBeInstanceOf(AbortSignal);
   });

   const timeoutUnderTest = () => {
      const controller = new AbortController();
      jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
      return () => controller.abort(new DOMException('The operation timed out.', 'TimeoutError'));
   };

   it('answers 504 and logs when the model does not respond in time', async () => {
      const expire = timeoutUnderTest();
      const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
      jest.mocked(google).mockReturnValue(
         new MockLanguageModelV3({
            doGenerate: ({ abortSignal }) => {
               expire();
               return Promise.reject(abortSignal?.reason);
            },
         }),
      );

      await expect(
         translateFields(prompts, Language.en, { title: 'Nemocnice' }, schema),
      ).rejects.toThrow(GatewayTimeoutException);
      expect(logError).toHaveBeenCalledWith(
         `Translation model timed out after ${TRANSLATION_TIMEOUT_MS} ms`,
      );
   });

   it('answers 504 when the time runs out while the SDK waits to retry', async () => {
      const expire = timeoutUnderTest();
      jest.spyOn(Logger.prototype, 'error').mockImplementation();
      const model = new MockLanguageModelV3({
         doGenerate: () => {
            setTimeout(expire, 10);
            return Promise.reject(
               new APICallError({
                  message: 'Service Unavailable',
                  url: 'https://model.test',
                  requestBodyValues: {},
                  statusCode: 503,
                  isRetryable: true,
               }),
            );
         },
      });
      jest.mocked(google).mockReturnValue(model);

      await expect(
         translateFields(prompts, Language.en, { title: 'Nemocnice' }, schema),
      ).rejects.toThrow(GatewayTimeoutException);
      expect(model.doGenerateCalls).toHaveLength(1);
   });

   it('passes an abort that is not the timeout on unchanged', async () => {
      timeoutUnderTest();
      const aborted = new DOMException('Aborted', 'AbortError');
      jest
         .mocked(google)
         .mockReturnValue(new MockLanguageModelV3({ doGenerate: () => Promise.reject(aborted) }));

      await expect(
         translateFields(prompts, Language.en, { title: 'Nemocnice' }, schema),
      ).rejects.toBe(aborted);
   });
});

describe('language names', () => {
   it('names every language once', () => {
      expect(LANGUAGE_NAMES).toEqual({ cs: 'Czech', en: 'English' });
   });

   it('names the languages a translation may start from', () => {
      expect(sourceLanguageNames(Language.cs)).toBe('English');
      expect(sourceLanguageNames(Language.en)).toBe('Czech');
   });
});
