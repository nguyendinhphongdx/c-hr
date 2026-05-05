import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>('cache.redisUrl');

    if (url) {
      this.client = createClient({ url });
    } else {
      const host = this.configService.get<string>('cache.redisHost', 'localhost');
      const port = this.configService.get<number>('cache.redisPort', 6379);
      const password = this.configService.get<string>('cache.redisPassword');
      this.client = createClient({
        socket: { host, port },
        password: password || undefined,
      });
    }

    this.client.on('error', (err) => this.logger.error('Redis Client Error', err));
    this.client.on('connect', () => this.logger.log('Redis Client Connected'));

    await this.client.connect();
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) await this.client.quit();
  }

  // Basic
  async get(key: string) {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttl?: number) {
    if (ttl) await this.client.setEx(key, ttl, value);
    else await this.client.set(key, value);
  }
  async del(key: string) {
    await this.client.del(key);
  }
  async exists(key: string) {
    return (await this.client.exists(key)) === 1;
  }

  // JSON helpers
  async getJson<T>(key: string): Promise<T | null> {
    const v = await this.get(key);
    return v ? JSON.parse(v) : null;
  }
  async setJson<T>(key: string, value: T, ttl?: number) {
    await this.set(key, JSON.stringify(value), ttl);
  }

  // Patterns
  async keys(pattern: string) {
    return this.client.keys(pattern);
  }
  async deletePattern(pattern: string) {
    const keys = await this.keys(pattern);
    if (keys.length) await this.client.del(keys);
  }

  // TTL
  async ttl(key: string) {
    return this.client.ttl(key);
  }
  async expire(key: string, seconds: number) {
    await this.client.expire(key, seconds);
  }

  // Counters
  async incr(key: string) {
    return this.client.incr(key);
  }
  async decr(key: string) {
    return this.client.decr(key);
  }
  async incrBy(key: string, n: number) {
    return this.client.incrBy(key, n);
  }

  // Hash
  async hSet(key: string, field: string, value: string) {
    await this.client.hSet(key, field, value);
  }
  async hGet(key: string, field: string) {
    return this.client.hGet(key, field);
  }
  async hGetAll(key: string) {
    return this.client.hGetAll(key);
  }

  // Pub/Sub
  async publish(channel: string, message: string) {
    return this.client.publish(channel, message);
  }
  async publishJson<T>(channel: string, data: T) {
    return this.publish(channel, JSON.stringify(data));
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
