import { SeedCommand } from './seed.command';

/**
 * Register CLI commands here. Each command must:
 * - Be `@Injectable()`
 * - Implement `CliCommand` (have `async run(args: string[])`)
 * - Be added to the `CliModule` providers list
 */
export const COMMANDS: Record<string, any> = {
  seed: SeedCommand,
};
