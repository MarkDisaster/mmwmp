import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRANSCRIBE_TIMEOUT_MS, transcribeRecording } from '../transcribeRecording';

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock('@/utils/axios', () => ({ apiFetch }));

const blob = new Blob(['x'], { type: 'audio/webm;codecs=opus' });

const hangUntilAborted = (_url: string, init: RequestInit) =>
   new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
   });

describe('transcribeRecording', () => {
   beforeEach(() => {
      apiFetch.mockReset();
   });

   it('should return the trimmed transcript', async () => {
      apiFetch.mockResolvedValue(Response.json({ text: '  ahoj ' }));
      await expect(transcribeRecording(blob, new AbortController().signal)).resolves.toBe('ahoj');
   });

   it('should return null when the API answers with an error', async () => {
      apiFetch.mockResolvedValue(new Response(null, { status: 502 }));
      await expect(transcribeRecording(blob, new AbortController().signal)).resolves.toBeNull();
   });

   it('should reject when the request outlives the timeout', async () => {
      const timeout = new AbortController();
      const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeout.signal);
      apiFetch.mockImplementation(hangUntilAborted);
      const result = transcribeRecording(blob, new AbortController().signal);
      const assertion = expect(result).rejects.toMatchObject({ name: 'TimeoutError' });
      timeout.abort(new DOMException('timed out', 'TimeoutError'));
      await assertion;
      expect(timeoutSpy).toHaveBeenCalledWith(TRANSCRIBE_TIMEOUT_MS);
      timeoutSpy.mockRestore();
   });

   it('should reject when the caller aborts before the timeout', async () => {
      apiFetch.mockImplementation(hangUntilAborted);
      const controller = new AbortController();
      const result = transcribeRecording(blob, controller.signal);
      const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
      controller.abort();
      await assertion;
   });
});
