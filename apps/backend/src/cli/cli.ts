import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { CliModule } from './cli.module';
import { COMMANDS } from './commands';

/**
 * Lightweight CLI runner.
 *
 * Usage:
 *   pnpm cli <command> [...args]
 *
 * Example:
 *   pnpm cli seed
 */
async function bootstrap() {
  const [, , commandName, ...args] = process.argv;

  if (!commandName) {
    console.log('Available commands:');
    Object.keys(COMMANDS).forEach((name) => console.log(`  - ${name}`));
    process.exit(0);
  }

  const Command = COMMANDS[commandName];
  if (!Command) {
    console.error(`Unknown command: ${commandName}`);
    console.log('Available commands:');
    Object.keys(COMMANDS).forEach((name) => console.log(`  - ${name}`));
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(CliModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('CLI');
  try {
    const cmd = app.get(Command);
    logger.log(`▶ Running: ${commandName}`);
    await cmd.run(args);
    logger.log(`✔ Done: ${commandName}`);
  } catch (e: any) {
    logger.error(`✗ Failed: ${commandName} - ${e.message}`, e.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
