/// <reference types="jest" />

import { UserChallengeRepository } from "../UserChallengeRepository";
import { database } from "../../database";
import { Q } from "@nozbe/watermelondb";

jest.mock("../../database", () => ({
  database: {
    collections: {
      get: jest.fn(),
    },
    write: jest.fn((cb: any) => cb()),
  },
}));

// Mock the Challenge model to have a table property
jest.mock("../../models/Challenge", () => {
  return {
    __esModule: true,
    default: {
      table: "challenge",
    },
  };
});

describe("UserChallengeRepository", () => {
  let repository: UserChallengeRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    const mockUserChallengeCollection = {
      query: jest.fn().mockReturnValue({
        fetch: jest.fn(),
        extend: jest.fn().mockReturnThis(),
      }),
      database: {
        collections: {
          get: jest.fn(),
        },
      },
    };

    const mockChallengeCollection = {
      query: jest.fn().mockReturnValue({
        fetch: jest.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              // Return mock challenges
              resolve(
                Array.from({ length: 100 }, (_, i) => ({
                  id: `c${i}`,
                  xpValue: 10,
                }))
              );
            }, 5); // Simulating 5ms for bulk fetch
          });
        }),
      }),
    };

    mockUserChallengeCollection.database.collections.get.mockImplementation((table: string) => {
      if (table === "challenge") return mockChallengeCollection;
      return mockUserChallengeCollection;
    });

    (database.collections.get as jest.Mock).mockImplementation((table: string) => {
      if (table === "challenge") return mockChallengeCollection;
      return mockUserChallengeCollection;
    });

    repository = new UserChallengeRepository();
  });

  describe("getTotalXPEarned", () => {
    it("should calculate total XP correctly and efficiently", async () => {
      // Create a large number of challenges
      const mockCompletedChallenges = Array.from({ length: 100 }, (_, i) => ({
        id: `uc${i}`,
        challengeId: `c${i}`,
        challenge: {
          fetch: jest.fn().mockResolvedValue({ xpValue: 10 }),
        },
      }));

      repository.getCompletedChallenges = jest.fn().mockResolvedValue(mockCompletedChallenges);

      const startTime = performance.now();
      const totalXP = await repository.getTotalXPEarned();
      const endTime = performance.now();

      expect(totalXP).toBe(1000); // 100 * 10

      console.log(`Execution time: ${endTime - startTime}ms`);
    });
  });
});
