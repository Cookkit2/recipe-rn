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

  describe("expireChallenges", () => {
    it("should throw error efficiently when an ID is not found", async () => {
      // We will mock the repository's collection
      // For batch fetch: missing one ID
      // For individual find: simulated 2ms per query (N+1 scenario)
      const mockTable = "user_challenges";

      const foundIds = Array.from({ length: 99 }, (_, i) => `id${i}`);
      const idsToQuery = [...foundIds, "missing-id"];

      // Setup the mocks for this specific test
      const mockCollection = {
        table: mockTable,
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue(
            foundIds.map((id) => ({
              id,
              prepareUpdate: jest.fn(),
            }))
          ),
        }),
        find: jest.fn().mockImplementation(async (id) => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              if (id === "missing-id") {
                reject(new Error(`Record ${mockTable}#${id} not found`));
              } else {
                resolve({
                  id,
                  prepareUpdate: jest.fn(),
                });
              }
            }, 2); // 2ms per query simulates async SQLite wait
          });
        }),
      };

      (repository as any).collection = mockCollection;
      (database.batch as jest.Mock) = jest.fn();

      const startTime = performance.now();

      await expect(repository.expireChallenges(idsToQuery)).rejects.toThrow(
        `Record ${mockTable}#missing-id not found`
      );

      const endTime = performance.now();
      console.log(`expireChallenges error fallback execution time: ${endTime - startTime}ms`);
    });
  });
});
