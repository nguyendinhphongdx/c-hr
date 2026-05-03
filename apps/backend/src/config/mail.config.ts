import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'localhost',
  port: parseInt(process.env.MAIL_PORT || '1025', 10),
  user: process.env.MAIL_USER || undefined,
  password: process.env.MAIL_PASSWORD || undefined,
  from: process.env.MAIL_FROM || 'noreply@example.com',
  secure: process.env.MAIL_SECURE === 'true',
}));
