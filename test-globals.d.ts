import { jest } from "@jest/globals";

declare global {
  const jest: typeof jest;
  const describe: any;
  const it: any;
  const test: any;
  const expect: any;
  const beforeEach: any;
  const afterEach: any;
  const beforeAll: any;
  const afterAll: any;
}
