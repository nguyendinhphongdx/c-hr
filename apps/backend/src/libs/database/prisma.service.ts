import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('📦 Database disconnected');
  }

  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    const models = Reflect.ownKeys(this).filter(
      (key: any) => key[0] !== '_' && key !== '$on' && key !== '$connect' && key !== '$disconnect',
    );
    return Promise.all(models.map((m: any) => (this as any)[m].deleteMany()));
  }
}
