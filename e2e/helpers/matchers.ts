import { by, element } from "detox";

export function byTestId(testId: string) {
  return element(by.id(testId));
}
