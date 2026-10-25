import { hasInstructionEvidence, hasLeadingCookingAction } from "../shared/instruction-evidence";

it("accepts quoted instructions despite formatting differences", () => {
  expect(hasInstructionEvidence("Whisk 2 eggs, then fry.", "🥚 WHISK 2 eggs — then fry!")).toBe(
    true
  );
});
it("rejects an invented method and duration from an ingredient-only caption", () => {
  expect(
    hasInstructionEvidence(
      "Steam for 15 minutes.",
      "Minced Chicken Steamed Egg. Egg 5, water 375ml."
    )
  ).toBe(false);
  expect(hasInstructionEvidence("Bake for 30 minutes.", "Bake for 20 minutes.")).toBe(false);
});
it("rejects dish titles and ingredient names as cooking steps", () => {
  expect(hasInstructionEvidence("Minced Chicken Steamed Egg", "Minced Chicken Steamed Egg")).toBe(
    false
  );
  expect(hasInstructionEvidence("Minced chicken", "Ingredients: Minced chicken")).toBe(false);
});
it("supports quoted Chinese and Malay preparation instructions", () => {
  expect(hasInstructionEvidence("蒸15分钟", "最后蒸15分钟即可食用。")).toBe(true);
  expect(
    hasInstructionEvidence("Kacau sehingga sebati.", "Kacau sehingga sebati. Kemudian masak.")
  ).toBe(true);
});
it("recognizes subtitle cooking actions without treating an introduction as a step", () => {
  expect(hasLeadingCookingAction("means chicken steam egg.")).toBe(false);
  expect(hasLeadingCookingAction("salt water")).toBe(false);
  for (const instruction of [
    "Add eggs.",
    "Steam for 15 minutes.",
    "Masukkan telur.",
    "Tapiskan buih wrap dan cucur.",
    "Tumiskan daun bawang.",
  ])
    expect(hasLeadingCookingAction(instruction)).toBe(true);
});
