export type EmailMessage = {
   to: string;
   subject: string;
   body: string;
};

export type SendEmailJobData = EmailMessage;

export type PasswordResetJobData = { userId: number };

export type InvitationJobData = { userId: number; invitedAt: string };

export type EmailJobData = SendEmailJobData | PasswordResetJobData | InvitationJobData;
