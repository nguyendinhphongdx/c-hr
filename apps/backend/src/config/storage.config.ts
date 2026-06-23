import { registerAs } from '@nestjs/config';

export type StorageType = 'local' | 's3' | 'gcs';

export default registerAs('storage', () => ({
  type: (process.env.STORAGE_TYPE || 'local') as StorageType,

  local: {
    path: process.env.STORAGE_LOCAL_PATH || 'uploads',
  },

  s3: {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_S3_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_S3_ENDPOINT,
  },

  gcs: {
    bucket: process.env.GCS_BUCKET,
    projectId: process.env.GCS_PROJECT_ID,
    keyFile: process.env.GCS_KEY_FILE,
    credentials: process.env.GCS_CREDENTIALS,
  },
}));
