import { voiceAnswerGenerator } from "../voice-answer-generator";
import { voiceCookingService } from "../voice-cooking";
import { log } from "../logger";

// Mock dependencies
jest.mock("../voice-cooking", () => ({
  voiceCookingService: {
    speak: jest.fn(),
  },
}));

jest.mock("../logger", () => ({
  log: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("VoiceAnswerGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("speakAnswer", () => {
    it("handles errors when voiceCookingService.speak fails", async () => {
      // Arrange
      const mockError = new Error("TTS failed");
      (voiceCookingService.speak as jest.Mock).mockRejectedValueOnce(mockError);

      const answer = {
        type: "step_clarification" as const,
        text: "The step says to bake for 20 minutes.",
      };

      // Act
      await voiceAnswerGenerator.speakAnswer(answer);

      // Assert
      expect(voiceCookingService.speak).toHaveBeenCalledWith(answer.text, {
        interrupt: true,
        onDone: undefined,
      });
      expect(log.error).toHaveBeenCalledWith("Failed to speak answer:", mockError);
      expect(log.debug).not.toHaveBeenCalled();
    });

    it("successfully speaks an answer with default options", async () => {
      // Arrange
      (voiceCookingService.speak as jest.Mock).mockResolvedValueOnce(undefined);

      const answer = {
        type: "ingredient_amount" as const,
        text: "You need 2 cups of flour.",
      };

      // Act
      await voiceAnswerGenerator.speakAnswer(answer);

      // Assert
      expect(voiceCookingService.speak).toHaveBeenCalledWith(answer.text, {
        interrupt: true,
        onDone: undefined,
      });
      expect(log.debug).toHaveBeenCalledWith(`Spoke answer: [${answer.type}] ${answer.text}`);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("successfully speaks an answer with custom options", async () => {
      // Arrange
      (voiceCookingService.speak as jest.Mock).mockResolvedValueOnce(undefined);

      const answer = {
        type: "temperature" as const,
        text: "Preheat the oven to 350 degrees.",
      };

      const onDoneMock = jest.fn();

      // Act
      await voiceAnswerGenerator.speakAnswer(answer, { interrupt: false, onDone: onDoneMock });

      // Assert
      expect(voiceCookingService.speak).toHaveBeenCalledWith(answer.text, {
        interrupt: false,
        onDone: onDoneMock,
      });
      expect(log.debug).toHaveBeenCalledWith(`Spoke answer: [${answer.type}] ${answer.text}`);
      expect(log.error).not.toHaveBeenCalled();
    });
  });
});
