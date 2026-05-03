import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { MailMessage } from './mail.types';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;
  private defaultFrom: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('mail.host');
    const port = this.configService.get<number>('mail.port');
    const user = this.configService.get<string>('mail.user');
    const password = this.configService.get<string>('mail.password');
    const secure = this.configService.get<boolean>('mail.secure');

    this.defaultFrom = this.configService.get<string>('mail.from', 'noreply@example.com');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && password ? { user, pass: password } : undefined,
    });

    this.logger.log(`Mail transport initialized: ${host}:${port}`);
  }

  /**
   * Send an email. Pass `html` or `text` directly.
   * Template-rendering can be added on top of this if needed.
   */
  async send(message: MailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: message.from || this.defaultFrom,
        to: Array.isArray(message.to) ? message.to.join(',') : message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
        attachments: message.attachments,
      });
      this.logger.debug(`Mail sent: to=${message.to}, subject="${message.subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send mail: ${error}`);
      throw error;
    }
  }
}
