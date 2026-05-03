export interface Attachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  template?: string;
  data?: Record<string, unknown>;
  html?: string;
  text?: string;
  attachments?: Attachment[];
  from?: string;
  replyTo?: string;
}
