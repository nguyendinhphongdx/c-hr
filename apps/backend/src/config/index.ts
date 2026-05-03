import appConfig from './app.config';
import authConfig from './auth.config';
import cacheConfig from './cache.config';
import databaseConfig from './database.config';
import storageConfig from './storage.config';
import mailConfig from './mail.config';

export { appConfig, authConfig, cacheConfig, databaseConfig, storageConfig, mailConfig };

export const configs = [
  appConfig,
  authConfig,
  cacheConfig,
  databaseConfig,
  storageConfig,
  mailConfig,
];
