import { by, element, waitFor } from "detox";
import { TEST_IDS } from "../../constants/test-ids";

export const AuthScreen = {
  async signIn() {
    await waitFor(element(by.id(TEST_IDS.auth.signInScreen)))
      .toBeVisible()
      .withTimeout(30000);
    await element(by.id(TEST_IDS.auth.emailInput)).replaceText("e2e@example.com");
    await element(by.id(TEST_IDS.auth.passwordInput)).replaceText("ValidPassword123!");
    await element(by.id(TEST_IDS.auth.signInButton)).tap();
  },
};
