import type { Timer } from "~/types/Timer";

export type CookingActivityTimer = {
  id: string;
  name: string;
  endsAt: number;
  remainingSeconds: number;
  paused: boolean;
};

export type CookingActivityProps = {
  timers: CookingActivityTimer[];
  totalCount: number;
  completed: boolean;
};

export interface CookingActivityInstance {
  update: (props: CookingActivityProps, staleDate?: Date) => Promise<void>;
  end: (policy: "immediate" | { after: Date }, props?: CookingActivityProps) => Promise<void>;
}

export interface CookingActivityFactory {
  getInstances: () => CookingActivityInstance[];
  start: (props: CookingActivityProps, url: string, staleDate?: Date) => CookingActivityInstance;
}

/** One recoverable activity for all timers; native date text handles background countdowns. */
export class CookingActivityController {
  private pending: Promise<void> = Promise.resolve();

  constructor(private readonly loadFactory: () => Promise<CookingActivityFactory>) {}

  sync(timers: Timer[], completedTimer?: Timer): Promise<void> {
    const now = Date.now();
    // Snapshot before queueing: the timer service mutates Timer objects in place.
    const active = timers
      .filter((timer) => timer.status === "running" || timer.status === "paused")
      .map((timer): CookingActivityTimer => ({
        id: timer.id,
        name: timer.name,
        endsAt: (timer.startedAt?.getTime() ?? now) + timer.durationSeconds * 1000,
        remainingSeconds: timer.remainingSeconds,
        paused: timer.status === "paused",
      }))
      .filter((timer) => timer.paused || timer.endsAt > now)
      .sort((a, b) => Number(a.paused) - Number(b.paused) || a.endsAt - b.endsAt);
    const props: CookingActivityProps = {
      timers: active.slice(0, 3),
      totalCount: active.length,
      completed: false,
    };
    const next = this.pending
      .catch(() => {})
      .then(async () => {
        const factory = await this.loadFactory();
        // Reacquire native instances after app relaunch or system removal.
        const [instance, ...duplicates] = factory.getInstances();
        await Promise.all(duplicates.map((duplicate) => duplicate.end("immediate")));
        if (props.totalCount === 0) {
          if (instance) {
            await instance.end(
              completedTimer ? { after: new Date(Date.now() + 60_000) } : "immediate",
              completedTimer
                ? {
                    timers: [
                      {
                        id: completedTimer.id,
                        name: completedTimer.name,
                        endsAt: now,
                        remainingSeconds: 0,
                        paused: false,
                      },
                    ],
                    totalCount: 0,
                    completed: true,
                  }
                : undefined
            );
          }
          return;
        }
        const firstRunning = props.timers.find((timer) => !timer.paused);
        const staleDate = firstRunning ? new Date(firstRunning.endsAt) : undefined;
        if (instance) {
          await instance.update(props, staleDate);
        } else {
          factory.start(props, "cookkit:///timers", staleDate);
        }
      });
    this.pending = next;
    return next;
  }
}
