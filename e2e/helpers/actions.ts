import { waitFor, element, by } from "detox";
import { byTestId } from "./matchers";

export async function waitForVisible(testId: string, timeout = 15000): Promise<void> {
  await waitFor(byTestId(testId)).toBeVisible().withTimeout(timeout);
}

export async function waitForText(text: string, timeout = 15000): Promise<void> {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
}

export async function tapById(testId: string): Promise<void> {
  await byTestId(testId).tap();
}

export async function replaceTextById(testId: string, text: string): Promise<void> {
  await byTestId(testId).replaceText(text);
}
