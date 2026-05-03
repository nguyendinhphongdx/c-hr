import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { SeedCommand } from './commands/seed.command';

/**
 * CLI module - reuses the application's full DI graph but adds command providers.
 */
@Module({
  imports: [AppModule],
  providers: [SeedCommand],
})
export class CliModule {}
