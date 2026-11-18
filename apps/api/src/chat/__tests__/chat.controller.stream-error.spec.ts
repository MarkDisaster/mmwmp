import { APICallError, RetryError, streamText, type UIMessageChunk } from 'ai';
import { convertReadableStreamToArray, MockLanguageModelV3 } from 'ai/test';

import { toStreamErrorMessage } from '../chat.controller';

const QUOTA = /kvóta AI provideru je vyčerpaná/;
const GENERIC = /narazila na chybu/;

const apiCallError = (statusCode: number, message: string) =>
   new APICallError({
      message,
      url: 'https://provider.test/v1/stream',
      requestBodyValues: {},
      statusCode,
      responseHeaders: { 'retry-after-ms': '0' },
   });

describe('toStreamErrorMessage', () => {
   it('reports a provider 429 as an exhausted quota', () => {
      expect(toStreamErrorMessage(apiCallError(429, 'Resource has been exhausted'))).toMatch(QUOTA);
   });

   it('reports a 429 that failed every retry as an exhausted quota', () => {
      const error = new RetryError({
         message: 'Failed after 3 attempts.',
         reason: 'maxRetriesExceeded',
         errors: [apiCallError(503, 'Unavailable'), apiCallError(429, 'Too many requests')],
      });

      expect(toStreamErrorMessage(error)).toMatch(QUOTA);
   });

   it.each([
      ['a full context window', apiCallError(400, 'maximum context length exceeded')],
      ['a server error', apiCallError(500, 'Rate limit of the upstream exceeded')],
      ['an error without a status', new Error('Quota exceeded')],
      ['a thrown string', 'rate limit exceeded'],
   ])('reports %s as a general error, whatever its text', (_, error) => {
      expect(toStreamErrorMessage(error)).toMatch(GENERIC);
   });
});

describe('toStreamErrorMessage — with the SDK stream', () => {
   it('maps a 429 the SDK retried and gave up on', async () => {
      const model = new MockLanguageModelV3({
         doStream: () => Promise.reject(apiCallError(429, 'Resource has been exhausted')),
      });

      const result = streamText({ model, prompt: 'Ahoj', onError: () => undefined });
      const chunks: UIMessageChunk[] = await convertReadableStreamToArray(
         result.toUIMessageStream({ onError: toStreamErrorMessage }),
      );

      expect(model.doStreamCalls).toHaveLength(3);
      expect(chunks).toContainEqual({ type: 'error', errorText: expect.stringMatching(QUOTA) });
   });
});
