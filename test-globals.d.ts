declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: any;
declare const beforeEach: (fn: () => void | Promise<void>) => void;
declare const afterEach: (fn: () => void | Promise<void>) => void;
declare const beforeAll: (fn: () => void | Promise<void>) => void;
declare const afterAll: (fn: () => void | Promise<void>) => void;

declare const jest: {
  fn: (impl?: any) => any;
  mock: (path: string, factory?: any) => void;
  clearAllMocks: () => void;
  spyOn: any;
  Mock: any;
};

declare namespace jest {
  type Mock = any;
}
