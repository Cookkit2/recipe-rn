import { by, element, waitFor } from "detox";
import { TEST_IDS } from "../../constants/test-ids";

export const HomeScreen = {
  async waitForDisplayed() {
    await waitFor(element(by.id(TEST_IDS.home.screen)))
      .toBeVisible()
      .withTimeout(30000);
  },
  async openSearch() {
    await element(by.label("Search")).tap();
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
