import { device } from "detox";
import { HomeScreen } from "../screens/HomeScreen";

describe("offline app shell", () => {
  beforeEach(async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await HomeScreen.waitForDisplayed();
  });

  it("opens local search from the pantry", async () => {
    await HomeScreen.openSearch();
  });

  it("opens the profile from the pantry", async () => {
    await HomeScreen.openProfile();
  });
});
