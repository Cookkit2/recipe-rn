import { by, device, element, expect, waitFor } from "detox";
import { TEST_IDS } from "~/constants/test-ids";

describe("Assistant", () => {
  it("adds an ingredient to the visible pantry and keeps it after relaunch", async () => {
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

    // Return to the already-mounted pantry: this catches missing query invalidation.
    await device.openURL({ url: "cookkit:///" });
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(20000);
    const eggs = element(by.text("eggs").withAncestor(by.id(TEST_IDS.home.pantryList)));
    const quantity = element(by.text("6 count").withAncestor(by.id(TEST_IDS.home.pantryList)));
    await waitFor(eggs).toBeVisible().withTimeout(20000);
    await expect(quantity).toBeVisible();

    // Preserve app data so a cloud-only write cannot pass as a local pantry update.
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);
    await waitFor(eggs).toBeVisible().withTimeout(20000);
    await expect(quantity).toBeVisible();
  });
});
