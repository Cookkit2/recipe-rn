import { TEST_IDS } from "~/constants/test-ids";
import { BaseScreen } from "./BaseScreen";

export class HomeScreen extends BaseScreen {
  constructor() {
    super(TEST_IDS.home.screen);
  }
}
