import { serve } from '@hono/node-server';

import { loadBootEnv } from './config/env';
import { seedConfigFromEnvIfEmpty } from './config/runtime';
import { closeDb, openDb } from './db/index';
import { runOnce, startScheduler, stopScheduler } from './poll/scheduler';
import { createServer } from './server/server';

async function main(): Promise<void> {
  const boot = loadBootEnv();
  console.log(`[zk-bridge] data dir: ${boot.dataDir}`);
  await openDb({ dataDir: boot.dataDir });
  await seedConfigFromEnvIfEmpty();

  const args = process.argv.slice(2);
  if (args.includes('--once')) {
    await runOnce();
    await closeDb();
    return;
  }

  const app = createServer();
  const httpServer = serve({
    fetch: app.fetch,
    port: boot.port,
    hostname: boot.bindHost,
  });
  console.log(`[zk-bridge] UI listening on http://${boot.bindHost}:${boot.port}`);

  await startScheduler();
  console.log(`[zk-bridge] running. Press Ctrl+C to stop.`);

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[zk-bridge] ${signal} received, shutting down ...`);
    await stopScheduler();
    httpServer.close();
    await closeDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[zk-bridge] FATAL:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
