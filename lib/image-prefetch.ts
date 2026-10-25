import { Image } from "expo-image";

type Policy = "disk" | "memory-disk";
type Job = {
  key: string;
  url: string;
  policy: Policy;
  limit: number;
  consumers: Set<AbortSignal>;
  promise: Promise<boolean>;
  resolve: (ok: boolean) => void;
};
const pending = new Map<string, Job>();
const queue: Job[] = [];
let running = false;

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      const first = queue[0]!;
      const limit = Math.min(8, ...queue.map((job) => job.limit));
      const batch: Job[] = [];
      while (queue.length && batch.length < limit && queue[0]!.policy === first.policy) {
        const job = queue.shift()!;
        if ([...job.consumers].every((signal) => signal.aborted)) {
          pending.delete(job.key);
          job.resolve(false);
        } else batch.push(job);
      }
      if (!batch.length) continue;
      let ok = false;
      try {
        ok = await Image.prefetch(
          batch.map((job) => job.url),
          { cachePolicy: first.policy }
        );
      } catch {
        // Failures are returned to subscribers; a later call may retry the URL.
      }
      for (const job of batch) {
        pending.delete(job.key);
        job.resolve(ok);
      }
    }
  } finally {
    running = false;
  }
}

/** Shared bounded queue; deduplicates overlapping requests across mounted lists. */
export function prefetchImages(
  urls: string[],
  policy: Policy,
  concurrency: number,
  signal: AbortSignal
): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  const limit = Number.isFinite(concurrency) ? Math.max(1, Math.floor(concurrency)) : 8;
  const jobs = urls.map((url) => {
    const key = `${policy}:${url}`;
    let job = pending.get(key);
    if (!job) {
      let resolve!: Job["resolve"];
      const promise = new Promise<boolean>((done) => {
        resolve = done;
      });
      job = { key, url, policy, limit, consumers: new Set(), promise, resolve };
      pending.set(key, job);
      queue.push(job);
    }
    job.consumers.add(signal);
    return job.promise;
  });
  void drain();
  return Promise.all(jobs).then((results) => results.every(Boolean));
}
