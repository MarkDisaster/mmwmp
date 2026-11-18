import { GatewayTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type IORedis from 'ioredis';

import { STT_TIMEOUT_MS, TTS_TIMEOUT_MS, VoiceService } from '../voice.service';

const redis = {
   multi: () => ({
      set() {
         return this;
      },
      incr() {
         return this;
      },
      exec: async () => [
         [null, 'OK'],
         [null, 1],
      ],
   }),
   getBuffer: jest.fn().mockResolvedValue(null),
   set: jest.fn().mockResolvedValue('OK'),
} as unknown as IORedis;

const service = new VoiceService(
   { get: jest.fn().mockReturnValue('sk-test') } as unknown as ConfigService,
   redis,
);

const audioFile = {
   buffer: Buffer.from('audio'),
   mimetype: 'audio/webm',
   originalname: 'a.webm',
} as Express.Multer.File;

describe('VoiceService', () => {
   let fetchMock: jest.SpyInstance;
   let timeoutSpy: jest.SpyInstance;

   beforeEach(() => {
      fetchMock = jest.spyOn(global, 'fetch');
      timeoutSpy = jest.spyOn(AbortSignal, 'timeout');
   });

   afterEach(() => jest.restoreAllMocks());

   const signalOfCall = () => (fetchMock.mock.calls[0]?.[1] as RequestInit).signal;

   it('gives the transcription request a timeout', async () => {
      fetchMock.mockResolvedValue(Response.json({ text: 'Ahoj', language: 'czech' }));

      await expect(service.transcribe(audioFile, 1)).resolves.toEqual({
         text: 'Ahoj',
         language: 'czech',
      });
      expect(timeoutSpy).toHaveBeenCalledWith(STT_TIMEOUT_MS);
      expect(signalOfCall()).toBe(timeoutSpy.mock.results[0]?.value);
   });

   it('gives the speech request a timeout', async () => {
      fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

      await expect(service.synthesize('Ahoj', 'nova', 1)).resolves.toEqual({
         audio: Buffer.from([1, 2, 3]),
         cached: false,
      });
      expect(timeoutSpy).toHaveBeenCalledWith(TTS_TIMEOUT_MS);
      expect(signalOfCall()).toBe(timeoutSpy.mock.results[0]?.value);
   });

   it('answers 504 when the provider does not respond in time', async () => {
      fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

      await expect(service.transcribe(audioFile, 1)).rejects.toBeInstanceOf(
         GatewayTimeoutException,
      );
      await expect(service.synthesize('Ahoj', 'nova', 1)).rejects.toBeInstanceOf(
         GatewayTimeoutException,
      );
   });

   it('answers 504 when reading the error body of the provider times out', async () => {
      fetchMock.mockResolvedValue({
         ok: false,
         status: 500,
         text: () => Promise.reject(new DOMException('The operation timed out.', 'TimeoutError')),
      } as unknown as Response);

      await expect(service.synthesize('Ahoj', 'nova', 1)).rejects.toBeInstanceOf(
         GatewayTimeoutException,
      );
   });

   it('logs only the start of a provider error body', async () => {
      const logged = jest
         .spyOn((service as unknown as { logger: { error: (m: string) => void } }).logger, 'error')
         .mockImplementation(() => undefined);
      fetchMock.mockResolvedValue(new Response('x'.repeat(5000), { status: 500 }));

      await expect(service.synthesize('Ahoj', 'nova', 1)).rejects.toBeInstanceOf(
         ServiceUnavailableException,
      );
      expect(logged.mock.calls[0]?.[0]).toBe(`OpenAI TTS failed (500): ${'x'.repeat(300)}`);
   });
});
