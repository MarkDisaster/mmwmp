import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
   jwtSecret: process.env.JWT_SECRET,
   jwtExpiration: parseInt(process.env.JWT_EXPIRATION || '3600', 10),
   jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
   jwtRefreshExpiration: parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800', 10),
   adminUrl: process.env.ADMIN_URL,
   previewUrlSigningKey: process.env.PREVIEW_URL_SIGNING_KEY || undefined,
   previewApiToken: process.env.PREVIEW_API_TOKEN || undefined,
   previewSecret: process.env.PREVIEW_SECRET || undefined,
}));
