import { voiceCookingService } from "../voice-cooking";

jest.mock("expo-speech", () => ({
  getAvailableVoicesAsync: jest.fn(),
  speak: jest.fn(),
  stop: jest.fn(),
}));

jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("~/utils/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { storage } from "~/data";

describe("voiceCookingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSettings", () => {
    it("starts voice cooking closed when no settings are stored", () => {
      (storage.get as jest.Mock).mockReturnValue(undefined);

      expect(voiceCookingService.getSettings()).toEqual({
        enabled: false,
        autoReadSteps: false,
        speechRate: 0.9,
        speechPitch: 1.0,
        language: "en-US",
      });
    });

    it("preserves stored voice cooking choices over defaults", () => {
      (storage.get as jest.Mock).mockReturnValue(
        JSON.stringify({
          enabled: true,
          autoReadSteps: true,
        })
      );

      expect(voiceCookingService.getSettings()).toEqual({
        enabled: true,
        autoReadSteps: true,
        speechRate: 0.9,
        speechPitch: 1.0,
        language: "en-US",
      });
    });
  });
});
