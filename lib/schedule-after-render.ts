/** Give the initial screen a paint opportunity before optional startup work. */
export function scheduleAfterInitialRender(task: () => void): () => void {
  let cancelled = false;
  let frame: number | undefined;
  let idle: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (cancelled) return;
    cancelled = true;
    task();
  };

  frame = requestAnimationFrame(() => {
    if (cancelled) return;
    frame = requestAnimationFrame(() => {
      if (cancelled) return;
      frame = undefined;
      if (typeof requestIdleCallback === "function") {
        idle = requestIdleCallback(run, { timeout: 2000 });
      } else {
        timer = setTimeout(run, 0);
      }
    });
  });

  return () => {
    cancelled = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    if (idle !== undefined && typeof cancelIdleCallback === "function") cancelIdleCallback(idle);
    if (timer !== undefined) clearTimeout(timer);
  };
}
