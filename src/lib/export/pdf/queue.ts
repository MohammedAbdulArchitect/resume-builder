// Small hand-rolled concurrency limiter (HLD.md §9.4, NFR N7) — PDF
// rendering is CPU-bound and blocks the event loop, so we gate it to a
// small number of concurrent jobs rather than pulling in a queue library
// for something this simple: one export can't stall unrelated requests on
// Hostinger's single Node process.
class ConcurrencyQueue {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

export const pdfRenderQueue = new ConcurrencyQueue(2);
