import { replaceTextById, tapById, waitForVisible } from "../helpers/actions";

export class BaseScreen {
  constructor(readonly screenId: string) {}

  async waitForDisplayed(timeout?: number): Promise<void> {
    await waitForVisible(this.screenId, timeout);
  }

  async tapButton(testId: string): Promise<void> {
    await tapById(testId);
  }

  async typeText(testId: string, text: string): Promise<void> {
    await replaceTextById(testId, text);
  }
}
