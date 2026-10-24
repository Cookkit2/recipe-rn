import { AsyncWorkQueue } from "../async-work-queue";
import { lazySingleton } from "../lazy-singleton";

it("constructs services only on first use and retains their method receiver", () => {
  const create = jest.fn(() => ({
    value: 3,
    read() {
      return this.value;
    },
  }));
  const service = lazySingleton(create);
  expect(create).not.toHaveBeenCalled();
  expect(service.read()).toBe(3);
  expect(service.read()).toBe(3);
  expect(create).toHaveBeenCalledTimes(1);
});

it("limits active jobs and skips cancelled queued jobs", async () => {
  const queue = new AsyncWorkQueue(1);
  let finish!: () => void;
  const first = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      })
  );
  const second = jest.fn(async () => {});
  const third = jest.fn(async () => {});
  const cancelled = new AbortController();
  const pending = [
    queue.run(first, new AbortController().signal),
    queue.run(second, cancelled.signal),
    queue.run(third, new AbortController().signal),
  ];
  await Promise.resolve();
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
  expect(third).not.toHaveBeenCalled();
  cancelled.abort();
  finish();
  await Promise.all(pending);
  expect(second).not.toHaveBeenCalled();
  expect(third).toHaveBeenCalledTimes(1);
});
