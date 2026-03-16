export const TIMER_STATUSES = ['idle', 'running', 'paused', 'completed'] as const;
export type TimerStatus = (typeof TIMER_STATUSES)[number];

export type Timer = {
  id: string;
  name: string;
  durationSeconds: number;
  remainingSeconds: number;
  status: TimerStatus;
  createdAt: Date;
  startedAt?: Date;
  pausedAt?: Date;
  completedAt?: Date;
  // Optional association with a recipe step
  recipeId?: string;
  stepNumber?: number;
};

export type TimerCreateInput = Pick<Timer, 'name' | 'durationSeconds' | 'recipeId' | 'stepNumber'>;

export type TimerUpdateInput = Partial<Pick<Timer, 'name'>>;

export type TimerNotification = {
  timerId: string;
  timerName: string;
  title: string;
  body: string;
  scheduledFor: Date;
};
