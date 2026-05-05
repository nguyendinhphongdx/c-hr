import * as path from 'node:path';

export interface BootEnv {
  dataDir: string;
  port: number;
  bindHost: string;
}

export function loadBootEnv(): BootEnv {
  return {
    dataDir: process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.resolve(process.cwd(), 'data'),
    port: Number(process.env.PORT ?? '7000'),
    bindHost: process.env.BIND_HOST ?? '127.0.0.1',
  };
}
