import type { LeftoverInput } from "~/types/Leftover";

export function defaultLeftoverReminder(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18);
}

export function validateLeftover(input: LeftoverInput, now = new Date()): void {
  if (!input.name.trim()) throw new Error("Enter a food name");
  if (!Number.isFinite(input.servings) || input.servings <= 0)
    throw new Error("Enter positive servings");
  if (!Number.isFinite(input.cookedAt.getTime()) || input.cookedAt > now)
    throw new Error("Choose a preparation date that is not in the future");
  if (input.remindAt && (!Number.isFinite(input.remindAt.getTime()) || input.remindAt <= now))
    throw new Error("Choose a future reminder time");
}
