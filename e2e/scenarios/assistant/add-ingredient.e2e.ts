import { by, device, element, expect, waitFor } from "detox";
import { TEST_IDS } from "~/constants/test-ids";

describe("Assistant", () => {
  it("adds an ingredient to the visible pantry and keeps it after relaunch", async () => {
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);

    await element(by.label("Search")).tap();
    await waitFor(element(by.id(TEST_IDS.search.screen)))
      .toBeVisible()
      .withTimeout(20000);
    const search = element(by.type("UISearchTextField"));
    await waitFor(search).toBeVisible().withTimeout(15000);
    await search.replaceText("Add 6 eggs to my pantry.");
    await element(by.id(TEST_IDS.search.askAssistant)).tap();

    await waitFor(element(by.text("Added to pantry")))
      .toBeVisible()
      .withTimeout(20000);
    await waitFor(element(by.text("Added eggs to your pantry.")))
      .toBeVisible()
      .withTimeout(20000);
    await waitFor(element(by.id(TEST_IDS.search.stopAssistant)))
      .not.toExist()
      .withTimeout(10000);

    await expect(element(by.id(TEST_IDS.assistant.bubble))).toBeVisible();
    await expect(element(by.id(TEST_IDS.assistant.list))).toBeVisible();

    // The iOS 27 search close button returns to the mounted pantry and checks query invalidation.
    await device.disableSynchronization();
    await element(by.label("close")).tap();
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(20000);
    const eggs = element(by.text("eggs").withAncestor(by.id(TEST_IDS.home.pantryList)));
    const quantity = element(by.text("6 count").withAncestor(by.id(TEST_IDS.home.pantryList)));
    await waitFor(eggs).toBeVisible().withTimeout(20000);
    await expect(quantity).toBeVisible();
    await device.enableSynchronization();

    // Preserve app data so a cloud-only write cannot pass as a local pantry update.
    // newInstance does not delete the install. A fresh process idles the way the
    // opening home wait did, so synchronization stays on for the persistence check.
    await device.launchApp({ newInstance: true });
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);
    await waitFor(eggs).toBeVisible().withTimeout(20000);
    await expect(quantity).toBeVisible();
  });
});
