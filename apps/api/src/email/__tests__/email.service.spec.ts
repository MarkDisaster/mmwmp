import type { ConfigService } from '@nestjs/config';

import { EmailService } from '../email.service';

const send = jest.fn();

jest.mock('resend', () => ({
   Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

describe('EmailService', () => {
   const config = {
      getOrThrow: (key: string) => (key === 'email.from' ? 'from@example.com' : 'key'),
   } as unknown as ConfigService;
   const params = { to: 'a@b.com', subject: 's', body: 'b' };

   beforeEach(() => send.mockReset());

   it('returns the data of a successful send', async () => {
      send.mockResolvedValueOnce({ data: { id: 'abc' }, error: null });
      await expect(new EmailService(config).sendEmail(params)).resolves.toEqual({ id: 'abc' });
   });

   it('throws when Resend resolves with an error so the job is retried', async () => {
      send.mockResolvedValueOnce({
         data: null,
         error: { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 },
      });
      await expect(new EmailService(config).sendEmail(params)).rejects.toThrow(
         'Resend rejected the email (name: rate_limit_exceeded, statusCode: 429)',
      );
   });

   it('keeps the recipient and the Resend message out of the thrown message', async () => {
      send.mockResolvedValueOnce({
         data: null,
         error: {
            name: 'validation_error',
            message: 'Invalid `to` field: jane.doe@example.com',
            statusCode: 422,
         },
      });
      const error = await new EmailService(config)
         .sendEmail({ ...params, to: 'jane.doe@example.com' })
         .catch((e: Error) => e);
      expect((error as Error).message).toBe(
         'Resend rejected the email (name: validation_error, statusCode: 422)',
      );
      expect((error as Error).message).not.toContain('jane.doe');
   });
});
