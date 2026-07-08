import { log } from "../logger";
import { voiceCookingService } from "../voice-cooking";

jest.mock("../logger", () => ({
  log: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn().mockResolvedValue([]),
}));

jest.mock("../../data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

describe("voiceCookingService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("callbacks", () => {
    it("should handle errors in speaking start callbacks gracefully", () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error("Start callback failed");
      });
      const successCallback = jest.fn();

      const unsubscribe1 = voiceCookingService.onSpeakingStart(errorCallback);
      const unsubscribe2 = voiceCookingService.onSpeakingStart(successCallback);

      // Accessing private method for testing purpose
      (voiceCookingService as any).notifySpeakingStart();

      expect(errorCallback).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(
        "Error in speaking start callback:",
        expect.any(Error)
      );
      expect(successCallback).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });

    it("should handle errors in speaking finish callbacks gracefully", () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error("Finish callback failed");
      });
      const successCallback = jest.fn();

      const unsubscribe1 = voiceCookingService.onSpeakingFinish(errorCallback);
      const unsubscribe2 = voiceCookingService.onSpeakingFinish(successCallback);

      // Accessing private method for testing purpose
      (voiceCookingService as any).notifySpeakingFinish();

      expect(errorCallback).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith(
        "Error in speaking finish callback:",
        expect.any(Error)
      );
      expect(successCallback).toHaveBeenCalled();

      unsubscribe1();
      unsubscribe2();
    });
  });
});
