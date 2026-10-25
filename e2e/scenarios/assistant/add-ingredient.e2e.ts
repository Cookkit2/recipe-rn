import { by, device, element, expect, waitFor } from "detox";
import { TEST_IDS } from "~/constants/test-ids";

describe("Assistant", () => {
  it("adds an ingredient to the visible pantry and keeps it after relaunch", async () => {
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);

    await waitFor(element(by.id(TEST_IDS.home.assistantButton)))
      .toBeVisible()
      .withTimeout(20000);
    await element(by.id(TEST_IDS.home.assistantButton)).tap();

    await waitFor(element(by.id(TEST_IDS.assistant.screen)))
      .toBeVisible()
      .withTimeout(20000);

    const composer = element(by.id(TEST_IDS.assistant.composer));
    // Existence is not enough to type: a LogBox toast can cover the field
    // while its frame is still fully on screen. Wait until the field is
    // actually visible, then type.
    await waitFor(composer).toBeVisible().withTimeout(15000);

    await composer.replaceText("Add 6 eggs to my pantry.");
    // replaceText focuses the field. The E2E composer stays pinned to the
    // bottom, so the keyboard dock covers Send: the Dictate key sits on the
    // button center (69x42 at y=824, Dictate at y=843). The list center is
    // above the keyboard; tapping it blurs the field. Then Send is hittable.
    await element(by.id(TEST_IDS.assistant.list)).tap();
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

    // cookkit:/// does not pop this stack. After openURL the Assistant card
    // was still the only visible screen (title, transcript, and composer).
    // Back returns to the already-mounted home screen, which is what
    // catches a missing pantry query invalidation. Home keeps the main queue
    // awake, so don't wait for idle around these taps.
    //
    // label "Back" matches the bar button and its chevron. id "BackButton"
    // still matches more than one view under the Assistant bar. The bar
    // itself is unique (its id is the screen title) and the back platter is
    // the 44pt control at (20, 0) inside it.
    const pop = (screenTitle: string) => element(by.id(screenTitle)).tap({ x: 42, y: 22 });
    await device.disableSynchronization();
    await pop("Assistant");
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
