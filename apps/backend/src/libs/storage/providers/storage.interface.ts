export interface UploadOptions {
  key: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StorageProvider {
  /** Upload a file. Returns the storage key (not URL). */
  upload(options: UploadOptions): Promise<string>;
  /** Delete a file by key. */
  delete(key: string): Promise<void>;
  /** Direct public URL (requires public bucket / static serving). */
  getPublicUrl(key: string): string;
  /** Time-limited signed URL for private access. */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
