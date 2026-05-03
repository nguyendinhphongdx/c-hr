---
title: Add a CLI command
description: How to register a new `pnpm cli <name>` command.
tags: [recipe, cli]
---

# Add a CLI command

The CLI runner reuses the full DI graph via `CliModule`. Each command is an `@Injectable()` class implementing the `CliCommand` interface.

## 1. Create the command class

```ts
// src/cli/commands/import-users.command.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database/prisma.service';
import { CliCommand } from '../contracts/cli-command.interface';

@Injectable()
export class ImportUsersCommand implements CliCommand {
  private readonly logger = new Logger(ImportUsersCommand.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(args: string[]): Promise<void> {
    const [filePath] = args;
    if (!filePath) {
      this.logger.error('Usage: pnpm cli import-users <file>');
      process.exit(1);
    }
    // ... implementation ...
    this.logger.log(`Imported users from ${filePath}`);
  }
}
```

## 2. Register the command

Two places:

**a.** Add as a provider in [src/cli/cli.module.ts](../../../src/cli/cli.module.ts):

```ts
import { ImportUsersCommand } from './commands/import-users.command';

@Module({
  imports: [AppModule],
  providers: [SeedCommand, ImportUsersCommand], // ← add here
})
export class CliModule {}
```

**b.** Map the command name in [src/cli/commands/index.ts](../../../src/cli/commands/index.ts):

```ts
import { SeedCommand } from './seed.command';
import { ImportUsersCommand } from './import-users.command';

export const COMMANDS: Record<string, any> = {
  seed: SeedCommand,
  'import-users': ImportUsersCommand,   // ← add here
};
```

## 3. Run

```bash
pnpm cli import-users path/to/file.csv
```

In production:

```bash
pnpm build
pnpm cli:prod import-users path/to/file.csv
```

## Argument parsing

`run(args)` receives everything after the command name as a string array. For richer parsing, install a flag parser (`commander`, `yargs`) and parse inside `run()` — but for most internal commands, simple positional args are enough.

## Why not [`nest-commander`](https://github.com/jmcdo29/nest-commander)?

`nest-commander` adds another decorator layer and dependency. The current runner is ~50 LOC, fully typed, and good enough for the tasks this boilerplate targets (seeding, reindexing, one-off scripts). Swap in `nest-commander` if your CLI grows beyond a dozen commands.
