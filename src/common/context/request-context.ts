import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestStore {
  userId: number | null;
}

export class RequestContext {
  private static readonly storage = new AsyncLocalStorage<RequestStore>();

  static run<T>(userId: number | null, callback: () => T): T {
    return this.storage.run({ userId }, callback);
  }

  static getUserId(): number | null {
    return this.storage.getStore()?.userId ?? null;
  }
}
