import { by, device, element, expect, waitFor } from "detox";
import { TEST_IDS } from "~/constants/test-ids";

describe("Assistant", () => {
  it("adds an ingredient to the visible pantry and keeps it after relaunch", async () => {
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);

    await element(by.label("Profile")).tap();

    // Home stays mounted under the profile card. Opening it left Detox busy
    // (pending animations and layout), and the assistant-button expectation
    // never completed. withTimeout() is also terminal in Detox 20, so it
    // cannot be combined with whileElement().scroll(). Skip synchronization
    // only until the assistant screen is on screen.
    await device.disableSynchronization();
    await waitFor(element(by.id(TEST_IDS.profile.screen)))
      .toBeVisible()
      .withTimeout(20000);
    await waitFor(element(by.id(TEST_IDS.profile.assistantButton)))
      .toBeVisible()
      .whileElement(by.id(TEST_IDS.profile.screen))
      .scroll(200, "down");
    await element(by.id(TEST_IDS.profile.assistantButton)).tap();
    await waitFor(element(by.id(TEST_IDS.assistant.composer)))
      .toBeVisible()
      .withTimeout(15000);
    await device.enableSynchronization();

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
