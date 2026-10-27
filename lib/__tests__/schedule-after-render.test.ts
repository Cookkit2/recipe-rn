import { scheduleAfterInitialRender } from "../schedule-after-render";

const frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
let idleTask: (() => void) | undefined;
const descriptors = [
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);

function frame() {
  const entry = frames.entries().next().value;
  if (!entry) throw new Error("No frame queued");
  frames.delete(entry[0]);
  entry[1](0);
}

beforeEach(() => {
  jest.useFakeTimers();
  frames.clear();
  idleTask = undefined;
  globalThis.requestAnimationFrame = jest.fn((callback) => {
    frames.set(++nextId, callback);
    return nextId;
  });
  globalThis.cancelAnimationFrame = jest.fn((id) => {
    if (typeof id === "number") frames.delete(id);
  });
  globalThis.requestIdleCallback = jest.fn((callback) => {
    idleTask = () => callback({ didTimeout: false, timeRemaining: () => 20 });
    return 100;
  });
  globalThis.cancelIdleCallback = jest.fn();
});
afterEach(() => {
  jest.useRealTimers();
  for (const [key, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

it("waits for a paint opportunity and idle time before running once", () => {
  const task = jest.fn();
  scheduleAfterInitialRender(task);
  frame();
  expect(task).not.toHaveBeenCalled();
  expect(requestIdleCallback).not.toHaveBeenCalled();
  frame();
  expect(task).not.toHaveBeenCalled();
  expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 2000 });
  idleTask?.();
  idleTask?.();
  expect(task).toHaveBeenCalledTimes(1);
});

it.each([0, 1, 2])("cancels startup work after %s frames", (count) => {
  const task = jest.fn();
  const cancel = scheduleAfterInitialRender(task);
  for (let index = 0; index < count; index++) frame();
  cancel();
  idleTask?.();
  expect(task).not.toHaveBeenCalled();
  if (count < 2) expect(frames.size).toBe(0);
  else expect(cancelIdleCallback).toHaveBeenCalledWith(100);
});

it("yields through a timer when idle callbacks are unavailable", () => {
  Reflect.deleteProperty(globalThis, "requestIdleCallback");
  const task = jest.fn();
  const cancel = scheduleAfterInitialRender(task);
  frame();
  frame();
  expect(task).not.toHaveBeenCalled();
  cancel();
  jest.runAllTimers();
  expect(task).not.toHaveBeenCalled();
  scheduleAfterInitialRender(task);
  frame();
  frame();
  jest.runAllTimers();
  expect(task).toHaveBeenCalledTimes(1);
});
