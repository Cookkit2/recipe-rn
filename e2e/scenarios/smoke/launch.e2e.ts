import { describe, it } from "@jest/globals";
import { waitForText, waitForVisible } from "../../helpers/actions";
import { TEST_IDS } from "~/constants/test-ids";

describe("launch", () => {
  it("opens the app on the home pantry screen", async () => {
    await waitForVisible(TEST_IDS.appRoot, 30000);
    await waitForText("Pantry", 30000);
  });
});
