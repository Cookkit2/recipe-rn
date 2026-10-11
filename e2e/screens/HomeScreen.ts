import { by, element, waitFor } from "detox";
import { TEST_IDS } from "../../constants/test-ids";

export const HomeScreen = {
  async waitForDisplayed() {
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);
  },
  async openSearch() {
    const search = element(by.label("Search").and(by.traits(["button"])));
    const attributes = await search.getAttributes();
    if ("elements" in attributes) {
      // UIKit exposes the enabled button and a disabled internal search image.
      const enabledIndices = attributes.elements
        .map((attribute, index) => (attribute.enabled ? index : -1))
        .filter((index) => index >= 0);
      if (enabledIndices.length !== 1) throw new Error("Expected one enabled native search button");
      await search.atIndex(enabledIndices[0]!).tap();
    } else {
      await search.tap();
    }
    await waitFor(element(by.id(TEST_IDS.search.screen)))
      .toBeVisible()
      .withTimeout(10000);
  },
  async openProfile() {
    await element(by.label("Profile")).tap();
    await waitFor(element(by.id(TEST_IDS.profile.screen)))
      .toBeVisible()
      .withTimeout(10000);
  },
};
