jest.mock("../AchievementService", () => ({
  achievementService: { checkAchievements: jest.fn() },
}));
jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));
import { scheduleAchievementCheck } from "../backgroundAchievements";
import { achievementService } from "../AchievementService";

it("coalesces queued mutations and checks again for changes made during an active pass", async () => {
  jest.useFakeTimers();
  let finish!: (value: never) => void;
  jest
    .mocked(achievementService.checkAchievements)
    .mockResolvedValue({} as never)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
  expect(scheduleAchievementCheck()).toBeUndefined();
  scheduleAchievementCheck();
  expect(achievementService.checkAchievements).not.toHaveBeenCalled();
  await jest.runAllTimersAsync();
  expect(achievementService.checkAchievements).toHaveBeenCalledTimes(1);
  scheduleAchievementCheck();
  await jest.runAllTimersAsync();
  expect(achievementService.checkAchievements).toHaveBeenCalledTimes(1);
  finish({} as never);
  await jest.runAllTimersAsync();
  expect(achievementService.checkAchievements).toHaveBeenCalledTimes(2);
  jest.useRealTimers();
});
