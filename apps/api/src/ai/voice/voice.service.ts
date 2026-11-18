import {
   BadRequestException,
   GatewayTimeoutException,
   HttpException,
   HttpStatus,
   Inject,
   Injectable,
   Logger,
   ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import IORedis from 'ioredis';

import { REDIS_CLIENT } from '@/redis/redis.module';

import type { TtsVoice } from './dto/synthesize.dto';

const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_TTS_URL = 'https://api.openai.com/v1/audio/speech';
const WHISPER_MODEL = 'whisper-1';
const TTS_MODEL = 'tts-1';

const TTS_CACHE_TTL_SECONDS = 60 * 60 * 24;
const TTS_CACHE_PREFIX = 'aurora:tts:';

export const STT_TIMEOUT_MS = 120_000;
export const TTS_TIMEOUT_MS = 60_000;
const PROVIDER_ERROR_LOG_CHARS = 300;

const RATE_LIMIT_PREFIX = 'aurora:voice:rl:';
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 20;

const isTimeoutError = (err: unknown) =>
   (err as { name?: unknown } | null)?.name === 'TimeoutError';

@Injectable()
export class VoiceService {
   private readonly logger = new Logger(VoiceService.name);
   private readonly openAiKey: string | undefined;

   constructor(
      private readonly config: ConfigService,
      @Inject(REDIS_CLIENT) private readonly redis: IORedis,
   ) {
      this.openAiKey = this.config.get<string>('OPENAI_API_KEY');
   }

   async transcribe(
      file: Express.Multer.File,
      userId: number,
   ): Promise<{ text: string; language: string | null }> {
      this.assertOpenAiConfigured();
      await this.assertWithinRateLimit(userId);

      if (!file?.buffer?.length) {
         throw new BadRequestException('Audio file is empty.');
      }

      const form = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], {
         type: file.mimetype || 'audio/webm',
      });
      form.append('file', blob, file.originalname || 'audio.webm');
      form.append('model', WHISPER_MODEL);
      form.append('response_format', 'verbose_json');

      const json = (await this.callOpenAi('Whisper STT', STT_TIMEOUT_MS, async (signal) => {
         const response = await fetch(OPENAI_WHISPER_URL, {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.openAiKey}` },
            body: form,
            signal,
         });
         await this.assertOk(response, 'Whisper STT', 'Speech-to-text provider failed.');
         return response.json();
      })) as { text?: string; language?: string };
      return { text: json.text ?? '', language: json.language ?? null };
   }

   async synthesize(
      text: string,
      voice: TtsVoice,
      userId: number,
   ): Promise<{ audio: Buffer; cached: boolean }> {
      this.assertOpenAiConfigured();
      await this.assertWithinRateLimit(userId);

      const cacheKey = this.ttsCacheKey(text, voice);
      const cached = await this.redis.getBuffer(cacheKey).catch((err) => {
         this.logger.warn(`TTS cache read failed: ${(err as Error).message}`);
         return null;
      });
      if (cached) {
         return { audio: cached, cached: true };
      }

      const audio = await this.callOpenAi('OpenAI TTS', TTS_TIMEOUT_MS, async (signal) => {
         const response = await fetch(OPENAI_TTS_URL, {
            method: 'POST',
            headers: {
               Authorization: `Bearer ${this.openAiKey}`,
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               model: TTS_MODEL,
               voice,
               input: text,
               response_format: 'mp3',
            }),
            signal,
         });
         await this.assertOk(response, 'OpenAI TTS', 'Text-to-speech provider failed.');
         return Buffer.from(await response.arrayBuffer());
      });

      this.redis
         .set(cacheKey, audio, 'EX', TTS_CACHE_TTL_SECONDS)
         .catch((err) => this.logger.warn(`TTS cache write failed: ${(err as Error).message}`));

      return { audio, cached: false };
   }

   private async callOpenAi<T>(
      label: string,
      timeoutMs: number,
      request: (signal: AbortSignal) => Promise<T>,
   ): Promise<T> {
      try {
         return await request(AbortSignal.timeout(timeoutMs));
      } catch (err) {
         if (isTimeoutError(err)) {
            this.logger.error(`${label} timed out after ${timeoutMs} ms`);
            throw new GatewayTimeoutException('Voice provider did not respond in time.');
         }
         throw err;
      }
   }

   private async assertOk(response: Response, label: string, message: string): Promise<void> {
      if (response.ok) return;
      const body = await response.text().catch((err: unknown) => {
         if (isTimeoutError(err)) throw err;
         return '';
      });
      this.logger.error(
         `${label} failed (${response.status}): ${body.slice(0, PROVIDER_ERROR_LOG_CHARS)}`,
      );
      throw new ServiceUnavailableException(message);
   }

   private assertOpenAiConfigured(): void {
      if (!this.openAiKey) {
         throw new ServiceUnavailableException(
            'OPENAI_API_KEY is not configured — voice features unavailable.',
         );
      }
   }

   private ttsCacheKey(text: string, voice: TtsVoice): string {
      const hash = createHash('sha256').update(`${voice}:${text}`).digest('hex');
      return `${TTS_CACHE_PREFIX}${hash}`;
   }

   private async assertWithinRateLimit(userId: number): Promise<void> {
      const key = `${RATE_LIMIT_PREFIX}${userId}`;
      const results = await this.redis
         .multi()
         .set(key, 0, 'EX', RATE_LIMIT_WINDOW_SECONDS, 'NX')
         .incr(key)
         .exec();
      if (!results) {
         this.logger.error('Redis rate-limit pipeline aborted (exec returned null)');
         throw new ServiceUnavailableException('Voice service temporarily unavailable.');
      }
      const count = Number(results[1]?.[1] ?? 0);
      if (count > RATE_LIMIT_MAX_REQUESTS) {
         throw new HttpException(
            `Voice rate limit exceeded — max ${RATE_LIMIT_MAX_REQUESTS} requests per minute.`,
            HttpStatus.TOO_MANY_REQUESTS,
         );
      }
   }
}
