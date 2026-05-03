---
title: Storage providers
description: Use local filesystem, S3, or GCS — the StorageProvider interface stays the same.
tags: [recipe, storage, s3, gcs]
---

# Storage providers

`StorageModule` chooses a provider based on `STORAGE_TYPE` env var (`local` | `s3` | `gcs`). Code consumes the abstract `StorageProvider` interface, so switching is a config change.

## Choose a provider

```bash
# .env
STORAGE_TYPE=s3
AWS_S3_BUCKET=my-bucket
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

S3 and GCS deps are listed under `optionalDependencies` so installing the boilerplate doesn't pull them by default. Install on demand:

```bash
# S3
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# GCS
pnpm add @google-cloud/storage
```

The factory in [src/libs/storage/storage.module.ts](../../../src/libs/storage/storage.module.ts) imports the right provider at startup. Trying to use S3 without installing the SDK throws a clear error.

## Using the storage in a service

```ts
import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER, StorageProvider, FileIns } from '@libs/storage';

@Injectable()
export class AvatarService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async uploadAvatar(userId: string, buffer: Buffer, mimeType: string) {
    const key = `avatars/pub_avatar_${Date.now()}_${userId}.${ext(mimeType)}`;
    await this.storage.upload({ key, buffer, mimeType });
    return key; // store the KEY in DB, not the URL
  }
}
```

## File keys vs URLs

**Store keys in the database, not URLs.** A key like `avatars/pub_avatar_1700000000000_abc.jpg` is provider-agnostic; the URL changes if you migrate from local to S3 to a CDN.

`FileIns` wraps a key with helpers:

```ts
import { FileIns } from '@libs/storage';

const f = new FileIns(key);
f.getUrl();              // public storage URL OR API endpoint for private files
await f.getSignedUrl();  // time-limited URL for direct download
await f.delete();
f.isPrivate();
```

## Key naming convention

```
{folder}/{visibility}_{purpose}_{timestamp}_{uuid}{ext}
         └── 'pub' or 'prv'
```

- `pub_*` — public file, served via direct URL.
- `prv_*` — private file, URL is an API endpoint that authorizes before redirecting.

You don't have to follow this scheme, but `FileIns.isValidKey()` and the `FileUrlInterceptor` (if you add one back) check for the `pub_`/`prv_` prefix.

## Static file serving (local mode)

In `local` mode, [src/main.ts](../../../src/main.ts) registers a static handler at `/uploads/*` pointing to `./uploads`. Public file URLs end up like:

```
http://localhost:3000/uploads/avatars/pub_avatar_<ts>_<uuid>.jpg
```

In production with S3/GCS you typically don't serve `/uploads/*` and `getPublicUrl()` returns the bucket URL directly.

## Adding a new provider

1. Implement `StorageProvider` in `src/libs/storage/providers/<name>-storage.provider.ts`.
2. Add the case to the factory in `src/libs/storage/storage.module.ts`.
3. Add config to `src/config/storage.config.ts`.
4. Document env vars in [reference/env-vars.md](../reference/env-vars.md).
