import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@libs/database/prisma.service';
import { CliCommand } from '../contracts/cli-command.interface';

@Injectable()
export class SeedCommand implements CliCommand {
  private readonly logger = new Logger(SeedCommand.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async run(): Promise<void> {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      this.logger.log(`Admin already exists: ${email}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.prisma.user.create({
      data: { email, password: passwordHash, name: 'Administrator', role: 'ADMIN' },
    });
    this.logger.log(`Created admin user: ${email}`);
  }
}
