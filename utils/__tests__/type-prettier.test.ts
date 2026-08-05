import { Prettify } from '../type-prettier';

// Type testing utilities
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;
type Expect<T extends true> = T;

describe('Prettify', () => {
  it('should evaluate and flatten intersection types correctly', () => {
    // 1. Basic intersection
    type Intersected = { a: string } & { b: number };
    type Result = Prettify<Intersected>;
    type Expected = { a: string; b: number };
    type _Test1 = Expect<Equal<Result, Expected>>;

    // 2. Nested objects
    type Nested = { a: { b: string } } & { c: number };
    type ResultNested = Prettify<Nested>;
    type ExpectedNested = { a: { b: string }; c: number };
    type _Test2 = Expect<Equal<ResultNested, ExpectedNested>>;

    // Runtime assertion to ensure the test block actually runs and succeeds
    const dummyResult: Result = { a: 'test', b: 1 };
    expect(dummyResult).toEqual({ a: 'test', b: 1 });
  });
});
