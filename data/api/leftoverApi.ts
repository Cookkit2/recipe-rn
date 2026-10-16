import { LeftoverRepository } from "~/data/db/repositories/LeftoverRepository";
import type { LeftoverInput, LeftoverStatus } from "~/types/Leftover";
import {
  syncLeftoverReminder,
  cancelLeftoverReminder,
} from "~/lib/notifications/leftover-reminders";
import { log } from "~/utils/logger";

export const leftoverApi = {
  listActive: () => new LeftoverRepository().listActive(),
  async save(input: LeftoverInput, id?: string) {
    const item = await new LeftoverRepository().save(input, id);
    let reminderScheduled = false;
    try {
      reminderScheduled = await syncLeftoverReminder(item, true);
    } catch (error) {
      log.warn("Couldn't schedule leftover reminder", error);
    }
    return { item, reminderScheduled };
  },
  async setStatus(id: string, status: LeftoverStatus) {
    await new LeftoverRepository().setStatus(id, status);
    try {
      await cancelLeftoverReminder(id);
    } catch (error) {
      log.warn("Couldn't cancel leftover reminder", error);
    }
  },
};
