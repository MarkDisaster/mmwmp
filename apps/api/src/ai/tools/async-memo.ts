export class AsyncMemo {
   private readonly results = new Map<string, Promise<unknown>>();

   run<T>(key: string, produce: () => Promise<T>): Promise<T> {
      const existing = this.results.get(key);
      if (existing) return existing as Promise<T>;
      const created = produce();
      this.results.set(key, created);
      created.catch(() => {
         if (this.results.get(key) === created) this.results.delete(key);
      });
      return created;
   }
}
