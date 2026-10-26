import { getYouTubeInstructionEvidence } from "../instructions";

it("merges caption and frame actions in video order, including short instructions", () => {
  expect(
    getYouTubeInstructionEvidence(
      "Rest 2mins.\n[417.8s] Rest 2mins.\n[226.8s] Sugar helps. Rub until no particle left.\nAt 242.4 seconds, pour egg into the bowl. At 4.4 seconds, heat a pan.\n[92.8s] Boil."
    )
  ).toEqual([
    { quote: "heat a pan.", timestamp: 4.4 },
    { quote: "Boil.", timestamp: 92.8 },
    { quote: "Rub until no particle left.", timestamp: 226.8 },
    { quote: "pour egg into the bowl.", timestamp: 242.4 },
    { quote: "Rest 2mins.", timestamp: 417.8 },
  ]);
});
it("ignores ingredient labels and bounds long caption tracks", () => {
  const instructions = getYouTubeInstructionEvidence(
    "Chicken 400g.\n" +
      Array.from({ length: 100 }, (_, index) => `[${index}s] Cook for ${index + 1} minutes.`).join(
        "\n"
      )
  );
  expect(instructions).toHaveLength(24);
  expect(instructions[0]).toEqual({ quote: "Cook for 1 minutes.", timestamp: 0 });
});
