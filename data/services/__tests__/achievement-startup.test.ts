jest.mock("~/data/db/database", () => ({
  database: { collections: { get: jest.fn(() => ({})) } },
}));
jest.mock("~/data/supabase-api/RecipeApi", () => ({ recipeApi: {} }));
jest.mock("~/data/storage", () => ({ storageFacade: {} }));
jest.mock("~/data", () => ({ storage: {} }));
jest.mock("~/lib/notifications/achievement-notifications", () => ({
  scheduleAchievementUnlock: jest.fn(),
}));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { AchievementService } from "../AchievementService";
import { database } from "~/data/db/database";
import { AchievementRepository } from "~/data/db/repositories/AchievementRepository";
import { UserAchievementRepository } from "~/data/db/repositories/UserAchievementRepository";
import type Achievement from "~/data/db/models/Achievement";
import type { AchievementRequirement } from "~/types/achievements";

it("does not construct repositories when service modules are imported", () => {
  expect(database.collections.get).not.toHaveBeenCalled();
});

it("calculates a shared metric only once per achievement-check pass", async () => {
  const service = new AchievementService();
  jest.spyOn(AchievementRepository.prototype, "getVisibleAchievements").mockResolvedValue([
    { id: "a", parsedRequirement: { metric: "ingredients_tracked", target: 3 } },
    { id: "b", parsedRequirement: { metric: "ingredients_tracked", target: 5 } },
  ] as unknown as Achievement[]);
  jest.spyOn(UserAchievementRepository.prototype, "getByAchievementIds").mockResolvedValue([]);
  jest.spyOn(UserAchievementRepository.prototype, "updateProgress").mockResolvedValue({} as never);
  const metric = jest
    .spyOn(
      service as unknown as {
        getCurrentProgress: (requirement: AchievementRequirement) => Promise<number>;
      },
      "getCurrentProgress"
    )
    .mockResolvedValue(2);
  const result = await service.checkAchievements();
  expect(result.progressUpdated).toHaveLength(2);
  expect(metric).toHaveBeenCalledTimes(1);
  await service.checkAchievements();
  expect(metric).toHaveBeenCalledTimes(2);
});
