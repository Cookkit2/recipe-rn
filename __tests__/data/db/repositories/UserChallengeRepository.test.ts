import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserChallengeRepository } from "../../../../data/db/repositories/UserChallengeRepository";

// Create a realistic-ish mock
const mockChallenges = Array.from({ length: 100 }, (_, i) => ({
  id: `challenge_${i}`,
  xpValue: 10,
}));

const mockUserChallenges = Array.from({ length: 100 }, (_, i) => ({
  id: `uc_${i}`,
  challengeId: `challenge_${i}`,
  challenge: {
    fetch: jest.fn().mockImplementation(() => {
      // Simulate slight delay for N+1
      return new Promise(resolve => setTimeout(() => resolve(mockChallenges[i]), 1));
    })
  }
}));

// Mock the dependencies and model
jest.mock("../../../../data/db/database", () => ({
  database: {
    write: jest.fn(async (cb: any) => cb()),
    collections: {
      get: jest.fn().mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockImplementation(() => {
             return new Promise(resolve => setTimeout(() => resolve(mockChallenges), 5));
          })
        })
      })
    }
  }
}));

jest.mock("../../../../data/db/models/Challenge", () => {
  return class Challenge {
    id = "challenge_1";
    xpValue = 50;
  }
});

jest.mock("../../../../data/db/models/UserChallenge", () => {
  return class UserChallenge {
    id = "user_challenge_1";
    challengeId = "challenge_1";
  }
});

describe("UserChallengeRepository XP Optimization", () => {
  let repo: UserChallengeRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new UserChallengeRepository();
    repo.getCompletedChallenges = jest.fn().mockResolvedValue(mockUserChallenges);
  });

  it("should benchmark getTotalXPEarned", async () => {
    const start = Date.now();
    const totalXP = await repo.getTotalXPEarned();
    const end = Date.now();

    console.log(`Time taken: ${end - start}ms`);
    expect(totalXP).toBe(1000); // 100 * 10
  });
});
