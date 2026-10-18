import { by, element, expect, waitFor } from "detox";
import { TEST_IDS } from "~/constants/test-ids";

describe("Assistant", () => {
  it("adds an ingredient from the fridge assistant", async () => {
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);

    await element(by.label("Profile")).tap();

    await waitFor(element(by.id(TEST_IDS.profile.assistantButton)))
      .toBeVisible()
      .withTimeout(20000)
      .whileElement(by.id(TEST_IDS.profile.screen))
      .scroll(200, "down");

    await element(by.id(TEST_IDS.profile.assistantButton)).tap();

    await waitFor(element(by.id(TEST_IDS.assistant.composer)))
      .toBeVisible()
      .withTimeout(15000);

    await element(by.id(TEST_IDS.assistant.composer)).replaceText("Add 6 eggs to my pantry.");
    await element(by.id(TEST_IDS.assistant.send)).tap();

    await waitFor(element(by.text("Updated pantry")))
      .toBeVisible()
      .withTimeout(20000);
    await waitFor(element(by.text("Added eggs to your pantry.")))
      .toBeVisible()
      .withTimeout(20000);
    await waitFor(element(by.text("Send")))
      .toBeVisible()
      .withTimeout(10000);

    await expect(element(by.id(TEST_IDS.assistant.bubble))).toBeVisible();
    await expect(element(by.id(TEST_IDS.assistant.list))).toBeVisible();
  });
});
