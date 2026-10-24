/** Bound expensive jobs and skip queued work whose owner has cancelled it. */
export class AsyncWorkQueue {
  private active = 0;
  private jobs: Array<() => void> = [];
  constructor(private readonly concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error("Invalid concurrency");
  }
  run<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.jobs.push(() => {
        if (signal.aborted) {
          resolve(undefined);
          this.pump();
          return;
        }
        this.active++;
        void Promise.resolve()
          .then(task)
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.pump();
          });
      });
      this.pump();
    });
  }
  private pump() {
    while (this.active < this.concurrency && this.jobs.length) this.jobs.shift()!();
  }
}
