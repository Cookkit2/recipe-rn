import { device } from "detox";
import { AuthScreen } from "../screens/AuthScreen";
import { HomeScreen } from "../screens/HomeScreen";

describe("mock authentication", () => {
  it("signs in and returns to the pantry", async () => {
    await device.launchApp({ newInstance: true, delete: true, url: "cookkit://sign-in" });
    await AuthScreen.signIn();
    await HomeScreen.waitForDisplayed();
  });
});
