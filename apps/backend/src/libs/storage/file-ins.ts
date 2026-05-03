import { StorageProvider } from './providers/storage.interface';

/**
 * FileIns - thin wrapper around a storage key.
 * After {@link FileIns.init} is called once at app startup, an instance only needs
 * the file key to do everything: get URL, signed URL, delete, etc.
 *
 * @example
 *   const f = new FileIns(key);
 *   f.getUrl();
 *   await f.getSignedUrl();
 *   await f.delete();
 */
export class FileIns {
  private static storage: StorageProvider;
  private static fileServiceUrl = '';

  static init(storage: StorageProvider, fileServiceUrl: string): void {
    FileIns.storage = storage;
    FileIns.fileServiceUrl = fileServiceUrl;
  }

  /** Format: {folder}/{visibility}_{purpose}_{ts}_{uuid}{ext} (visibility = pub|prv). */
  static isValidKey(key: string): boolean {
    if (key.startsWith('http://') || key.startsWith('https://')) return false;
    const filename = key.split('/').pop() || '';
    return filename.startsWith('pub_') || filename.startsWith('prv_');
  }

  static isPrivateKey(key: string): boolean {
    const filename = key.split('/').pop() || '';
    return filename.startsWith('prv_');
  }

  constructor(private readonly key: string) {}

  getKey(): string {
    return this.key;
  }
  isPrivate(): boolean {
    return FileIns.isPrivateKey(this.key);
  }
  isPublic(): boolean {
    return !this.isPrivate();
  }

  /** URL for frontend - public: direct storage URL, private: API endpoint that auths and redirects. */
  getUrl(): string {
    if (this.isPrivate()) {
      return `${FileIns.fileServiceUrl}/files/${encodeURIComponent(this.key)}/view`;
    }
    return FileIns.storage.getPublicUrl(this.key);
  }

  async getSignedUrl(expiresIn = 3600): Promise<string> {
    return FileIns.storage.getSignedUrl(this.key, expiresIn);
  }

  getDirectUrl(): string {
    return FileIns.storage.getPublicUrl(this.key);
  }

  async delete(): Promise<void> {
    await FileIns.storage.delete(this.key);
  }

  toString(): string {
    return this.key;
  }

  toJSON(): string {
    return this.getUrl();
  }
}
