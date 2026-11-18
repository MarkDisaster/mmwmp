import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

type SendEmailParams = {
   to: string;
   subject: string;
   body: string;
};

@Injectable()
export class EmailService {
   private readonly resend: Resend;
   private readonly fromEmail: string;

   constructor(private config: ConfigService) {
      this.resend = new Resend(this.config.getOrThrow<string>('email.apiKey'));
      this.fromEmail = this.config.getOrThrow<string>('email.from');
   }

   async sendEmail({ to, subject, body }: SendEmailParams) {
      const { data, error } = await this.resend.emails.send({
         from: this.fromEmail,
         to,
         subject,
         text: body,
      });
      if (error) {
         throw new Error(
            `Resend rejected the email (name: ${error.name}, statusCode: ${error.statusCode})`,
         );
      }
      return data;
   }
}
